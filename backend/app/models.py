import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def uuid_string():
    return str(uuid.uuid4())


class Category(Base):
    __tablename__ = 'categories'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_string)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    products: Mapped[list['Product']] = relationship(back_populates='category')


class Product(Base):
    __tablename__ = 'products'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_string)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey('categories.id'), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    weight: Mapped[str | None] = mapped_column(String(50), nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    category: Mapped['Category'] = relationship(back_populates='products')
    order_items: Mapped[list['OrderItem']] = relationship(back_populates='product')


class User(Base):
    __tablename__ = 'users'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_string)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default='admin', nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Order(Base):
    __tablename__ = 'orders'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_string)
    customer_name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default='new', nullable=False)
    total: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    items: Mapped[list['OrderItem']] = relationship(back_populates='order', cascade='all, delete-orphan')


class OrderItem(Base):
    __tablename__ = 'order_items'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_string)
    order_id: Mapped[str] = mapped_column(String(36), ForeignKey('orders.id'), nullable=False)
    product_id: Mapped[str | None] = mapped_column(String(36), ForeignKey('products.id'), nullable=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    order: Mapped['Order'] = relationship(back_populates='items')
    product: Mapped['Product'] = relationship(back_populates='order_items')


class AdminPushSubscription(Base):
    __tablename__ = 'admin_push_subscriptions'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_string)
    endpoint: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    p256dh: Mapped[str] = mapped_column(Text, nullable=False)
    auth_key: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
