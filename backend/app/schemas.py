from datetime import datetime

from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    image_url: str | None = None
    is_active: bool
    sort_order: int

    model_config = {'from_attributes': True}


class CategoryCreate(BaseModel):
    name: str
    description: str | None = None
    image_url: str | None = None
    is_active: bool = True
    sort_order: int = 0


class CategoryUpdate(CategoryCreate):
    pass


class ProductOut(BaseModel):
    id: str
    category_id: str
    name: str
    description: str | None = None
    price: float
    weight: str | None = None
    image_url: str | None = None
    is_available: bool
    is_featured: bool

    model_config = {'from_attributes': True}


class ProductCreate(BaseModel):
    category_id: str
    name: str
    description: str | None = None
    price: float
    weight: str | None = None
    image_url: str | None = None
    is_available: bool = True
    is_featured: bool = False


class ProductUpdate(ProductCreate):
    pass


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'


class OrderItemOut(BaseModel):
    id: str
    product_id: str | None = None
    name: str
    price: float
    quantity: int

    model_config = {'from_attributes': True}


class OrderOut(BaseModel):
    id: str
    customer_name: str
    phone: str
    address: str | None = None
    comment: str | None = None
    status: str
    total: float
    created_at: datetime
    items: list[OrderItemOut] = []

    model_config = {'from_attributes': True}


class OrderStatusUpdate(BaseModel):
    status: str


class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int = 1


class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    address: str | None = None
    comment: str | None = None
    items: list[OrderItemCreate]


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionIn(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys


class PushSubscriptionDelete(BaseModel):
    endpoint: str
