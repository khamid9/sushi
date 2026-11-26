import logging
import secrets
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import boto3
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from botocore.exceptions import BotoCoreError, ClientError
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AdminPushSubscription, Category, Product, Order
from app.schemas import (
    CategoryCreate, CategoryOut, CategoryUpdate,
    LoginIn, TokenOut, ProductCreate, ProductOut, ProductUpdate,
    OrderOut, OrderStatusUpdate, PushSubscriptionIn, PushSubscriptionDelete,
)

router = APIRouter(prefix='/api/admin', tags=['admin'])
bearer = HTTPBearer()
logger = logging.getLogger(__name__)


def ensure_admin_security_configured():
    if settings.app_env.lower() != 'production':
        return
    if (
        not settings.admin_username.strip()
        or not settings.admin_password.strip()
        or settings.admin_password == 'admin'
        or settings.jwt_secret.strip() in {'', 'change-me-in-production'}
    ):
        raise HTTPException(
            status_code=503,
            detail='Задайте ADMIN_USERNAME, непустой ADMIN_PASSWORD не admin и секретный JWT_SECRET на сервере',
        )


def create_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=12)
    return jwt.encode({'sub': username, 'exp': expire}, settings.jwt_secret, algorithm='HS256')


def require_admin(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    ensure_admin_security_configured()
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=['HS256'])
        if payload.get('sub') != settings.admin_username:
            raise HTTPException(status_code=401, detail='Недействительный токен')
    except JWTError:
        raise HTTPException(status_code=401, detail='Недействительный токен')
    return payload


@router.post('/login', response_model=TokenOut)
def login(data: LoginIn):
    ensure_admin_security_configured()
    username_ok = secrets.compare_digest(data.username, settings.admin_username)
    password_ok = secrets.compare_digest(data.password, settings.admin_password)
    if not (username_ok and password_ok):
        raise HTTPException(status_code=401, detail='Неверный логин или пароль')
    return TokenOut(access_token=create_token(data.username))


@router.get('/me')
def me(_: dict = Depends(require_admin)):
    return {'username': settings.admin_username, 'role': 'admin'}


@router.get('/push/vapid-public-key')
def get_push_public_key(_: dict = Depends(require_admin)):
    if not settings.vapid_public_key or not settings.vapid_private_key:
        raise HTTPException(status_code=503, detail='Push-уведомления не настроены на сервере')
    return {'public_key': settings.vapid_public_key}


@router.post('/push-subscriptions')
def save_push_subscription(
    data: PushSubscriptionIn,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    subscription = db.query(AdminPushSubscription).filter(
        AdminPushSubscription.endpoint == data.endpoint,
    ).first()
    if subscription:
        subscription.p256dh = data.keys.p256dh
        subscription.auth_key = data.keys.auth
    else:
        subscription = AdminPushSubscription(
            endpoint=data.endpoint,
            p256dh=data.keys.p256dh,
            auth_key=data.keys.auth,
        )
        db.add(subscription)
    db.commit()
    return {'ok': True}


@router.delete('/push-subscriptions')
def delete_push_subscription(
    data: PushSubscriptionDelete,
    db: Session = Depends(get_db),
    _: dict = Depends(require_admin),
):
    subscription = db.query(AdminPushSubscription).filter(
        AdminPushSubscription.endpoint == data.endpoint,
    ).first()
    if subscription:
        db.delete(subscription)
        db.commit()
    return {'ok': True}


@router.get('/categories', response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    return db.query(Category).order_by(Category.sort_order, Category.name).all()


@router.post('/categories', response_model=CategoryOut)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    item = Category(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put('/categories/{category_id}', response_model=CategoryOut)
def update_category(category_id: str, data: CategoryUpdate, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    item = db.query(Category).filter(Category.id == category_id).first()
    if not item:
        raise HTTPException(status_code=404, detail='Категория не найдена')
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete('/categories/{category_id}')
def delete_category(category_id: str, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    item = db.query(Category).filter(Category.id == category_id).first()
    if not item:
        raise HTTPException(status_code=404, detail='Категория не найдена')
    if db.query(Product).filter(Product.category_id == category_id).first():
        raise HTTPException(status_code=409, detail='Сначала удалите товары этой категории')
    db.delete(item)
    db.commit()
    return {'ok': True}


@router.get('/products', response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    return db.query(Product).order_by(Product.is_featured.desc(), Product.name).all()


@router.post('/products', response_model=ProductOut)
def create_product(data: ProductCreate, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    if not db.query(Category).filter(Category.id == data.category_id).first():
        raise HTTPException(status_code=404, detail='Категория не найдена')
    item = Product(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put('/products/{product_id}', response_model=ProductOut)
def update_product(product_id: str, data: ProductUpdate, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    item = db.query(Product).filter(Product.id == product_id).first()
    if not item:
        raise HTTPException(status_code=404, detail='Товар не найден')
    if not db.query(Category).filter(Category.id == data.category_id).first():
        raise HTTPException(status_code=404, detail='Категория не найдена')
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete('/products/{product_id}')
def delete_product(product_id: str, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    item = db.query(Product).filter(Product.id == product_id).first()
    if not item:
        raise HTTPException(status_code=404, detail='Товар не найден')
    db.delete(item)
    db.commit()
    return {'ok': True}


@router.post('/upload')
def upload_image(file: UploadFile = File(...), _: dict = Depends(require_admin)):
    allowed = {'image/jpeg', 'image/png', 'image/webp'}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail='Разрешены JPG, PNG и WEBP')
    suffix = Path(file.filename or '').suffix.lower()
    if suffix not in {'.jpg', '.jpeg', '.png', '.webp'}:
        raise HTTPException(status_code=400, detail='Неверный формат файла')
    filename = f'{uuid.uuid4().hex}{suffix}'
    if settings.r2_configured:
        try:
            client = boto3.client(
                's3',
                endpoint_url=settings.r2_endpoint_url,
                aws_access_key_id=settings.r2_access_key_id,
                aws_secret_access_key=settings.r2_secret_access_key,
                region_name='auto',
            )
            client.put_object(
                Bucket=settings.r2_bucket,
                Key=f'uploads/{filename}',
                Body=file.file,
                ContentType=file.content_type or 'application/octet-stream',
            )
        except (BotoCoreError, ClientError) as error:
            logger.exception('Could not upload product image to R2')
            raise HTTPException(status_code=502, detail='Не удалось сохранить изображение') from error
        return {'url': f'{settings.r2_public_base_url.rstrip("/")}/uploads/{filename}'}

    if settings.app_env != 'development':
        raise HTTPException(status_code=503, detail='Хранилище фото R2 не настроено на сервере')

    upload_dir = Path(__file__).resolve().parents[2] / 'public' / 'uploads'
    upload_dir.mkdir(parents=True, exist_ok=True)
    try:
        (upload_dir / filename).write_bytes(file.file.read())
    except OSError as error:
        logger.exception('Could not save product image locally')
        raise HTTPException(status_code=500, detail='Не удалось сохранить изображение') from error
    return {'url': f'/uploads/{filename}'}


@router.get('/orders', response_model=list[OrderOut])
def list_orders(db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    return db.query(Order).order_by(Order.created_at.desc()).all()


@router.get('/orders/{order_id}', response_model=OrderOut)
def get_order(order_id: str, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    item = db.query(Order).filter(Order.id == order_id).first()
    if not item:
        raise HTTPException(status_code=404, detail='Заказ не найден')
    return item


@router.patch('/orders/{order_id}/status', response_model=OrderOut)
def change_order_status(order_id: str, data: OrderStatusUpdate, db: Session = Depends(get_db), _: dict = Depends(require_admin)):
    allowed = {'new', 'accepted', 'cooking', 'delivering', 'done', 'cancelled'}
    if data.status not in allowed:
        raise HTTPException(status_code=400, detail='Недопустимый статус')
    item = db.query(Order).filter(Order.id == order_id).first()
    if not item:
        raise HTTPException(status_code=404, detail='Заказ не найден')
    item.status = data.status
    db.commit()
    db.refresh(item)
    return item
