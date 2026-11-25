from sqlalchemy.orm import Session

from app.models import Category, Product


CATEGORIES = [
    ('Роллы', 'Классические, запечённые и роллы в темпуре'),
    ('Пицца', 'Диаметр 35 см · на тонком хрустящем тесте'),
    ('Закуски', 'Закуски к основному заказу'),
]

PRODUCTS = [
    ('Роллы', 'Калифорния', 'Рис, краб, огурец, сливочный сыр, икра масаго', 300, '10 шт.', 'menu-06.jpeg'),
    ('Роллы', 'Чикен', 'Рис, курица, сливочный сыр, огурец, кунжут', 280, '10 шт.', 'menu-02.jpeg'),
    ('Роллы', 'Краб темпура', 'Рис, краб, огурец, фирменный соус', 350, '10 шт.', 'menu-01.jpeg'),
    ('Роллы', 'Мидии темпура', 'Рис, мидии, огурец, сливочный сыр, фирменный соус', 350, '10 шт.', 'menu-04.jpeg'),
    ('Роллы', 'Тамаго темпура', 'Рис, сливочный сыр, тамаго, фирменный соус', 350, '10 шт.', 'menu-05.jpeg'),
    ('Роллы', 'Чикен темпура', 'Рис, курица, китайская капуста, сливочный сыр, фирменный соус', 350, '10 шт.', 'menu-12.jpeg'),
    ('Роллы', 'Запечённый ролл «Мидии»', 'Рис, мидии, тамаго, сливочный сыр, соус яки, кунжут', 350, '10 шт.', 'menu-08.jpeg'),
    ('Роллы', 'Запечённая «Калифорния»', 'Рис, краб, огурец, икра масаго, соус яки', 350, '10 шт.', 'menu-07.jpeg'),
    ('Роллы', 'Запечённый ролл «Тамаго»', 'Рис, хрустящий лист нори, сливочный сыр, тамаго, соус яки', 290, '10 шт.', 'menu-09.jpeg'),
    ('Роллы', 'Ролл «Нежный»', 'Рис, хрустящий лист нори, курица, китайская капуста, фирменный соус', 300, '10 шт.', 'menu-10.jpeg'),
    ('Пицца', 'Маргарита', 'Томатный соус, помидоры и сыр моцарелла', 420, '35 см', 'pizza/margherita.png'),
    ('Пицца', 'Пепперони', 'Колбаса пепперони, сыр моцарелла и томатный соус', 420, '35 см', 'pizza/pepperoni.png'),
    ('Пицца', 'Острая', 'Колбаса пепперони, помидоры, сладкий перец, халапеньо и сыр моцарелла', 450, '35 см', 'pizza/spicy.png'),
    ('Пицца', 'Курица с грибами', 'Курица, грибы, маринованный огурец, сыр моцарелла, фирменный соус', 490, '35 см', 'pizza/chicken-mushroom.png'),
    ('Пицца', 'Гавайская', 'Цыплёнок, ананас, сыр моцарелла, фирменный соус', 520, '35 см', 'pizza/hawaiian.png'),
    ('Закуски', 'Картофель фри', 'Порция картофеля фри', 130, '150 г', 'menu-18.jpeg'),
]


def seed_catalog(db: Session) -> None:
    categories = {category.name: category for category in db.query(Category).all()}

    for sort_order, (name, description) in enumerate(CATEGORIES, start=1):
        category = categories.get(name)
        if category:
            category.description = description
            category.is_active = True
            category.sort_order = sort_order
        else:
            category = Category(
                name=name,
                description=description,
                is_active=True,
                sort_order=sort_order,
            )
            db.add(category)
            db.flush()
            categories[name] = category

    known_category_names = {name for name, _ in CATEGORIES}
    for category in db.query(Category).all():
        if category.name not in known_category_names:
            category.is_active = False

    known_product_names = {name for _, name, *_ in PRODUCTS}
    for product in db.query(Product).all():
        if product.name not in known_product_names:
            db.delete(product)

    for category_name, name, description, price, weight, image_name in PRODUCTS:
        product = db.query(Product).filter(Product.name == name).first()
        values = {
            'category_id': categories[category_name].id,
            'description': description,
            'price': price,
            'weight': weight,
            'is_available': True,
            'image_url': f'/menu/{image_name}',
        }
        if product:
            for field, value in values.items():
                setattr(product, field, value)
        else:
            db.add(Product(name=name, **values))

    db.commit()
