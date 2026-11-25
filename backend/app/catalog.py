import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Category, Order, OrderItem, Product
from app.push_notifications import notify_admins_of_order
from app.schemas import CategoryOut, OrderCreate, OrderOut, ProductOut

router = APIRouter(prefix='/api', tags=['catalog'])
logger = logging.getLogger(__name__)


@router.get('/categories', response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.is_active.is_(True)).order_by(Category.sort_order, Category.name).all()


@router.get('/products', response_model=list[ProductOut])
def list_products(
    category_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Product).filter(Product.is_available.is_(True))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    return query.order_by(Product.is_featured.desc(), Product.name).all()


@router.post('/orders', response_model=OrderOut)
def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    if not data.items:
        raise HTTPException(status_code=400, detail='Корзина пуста')
    if len(data.customer_name.strip()) < 2:
        raise HTTPException(status_code=400, detail='Укажите имя')
    phone_digits = ''.join(character for character in data.customer_phone if character.isdigit())
    if len(phone_digits) < 10:
        raise HTTPException(status_code=400, detail='Укажите корректный номер телефона')

    order = Order(
        customer_name=data.customer_name.strip(),
        phone=data.customer_phone.strip(),
        address=data.address.strip() if data.address else None,
        comment=data.comment.strip() if data.comment else None,
    )
    total = 0
    for entry in data.items:
        if entry.quantity < 1 or entry.quantity > 99:
            raise HTTPException(status_code=400, detail='Некорректное количество товара')
        product = db.query(Product).filter(Product.id == entry.product_id, Product.is_available.is_(True)).first()
        if not product:
            raise HTTPException(status_code=404, detail='Товар недоступен')
        price = float(product.price)
        subtotal = price * entry.quantity
        total += subtotal
        order.items.append(OrderItem(product_id=product.id, name=product.name, price=price, quantity=entry.quantity))

    order.total = total
    db.add(order)
    db.commit()
    db.refresh(order)
    try:
        notify_admins_of_order(db, order)
    except Exception:
        logger.exception('Order %s was saved, but push notification processing failed', order.id)
    return order


@router.get('/products/{product_id}', response_model=ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id, Product.is_available.is_(True)).first()
    if not product:
        raise HTTPException(status_code=404, detail='Товар не найден')
    return product
