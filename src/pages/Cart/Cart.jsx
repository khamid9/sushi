import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header/Header.jsx';
import Footer from '../../components/Footer/Footer.jsx';
import { useCart } from '../../context/CartContext.jsx';
import CheckoutModal from '../../components/CheckoutModal/CheckoutModal.jsx';
import styles from './Cart.module.css';
import { getOptimizedMenuImageUrl } from '../../lib/menuImages.js';

function Cart() {
  const { items, setQuantity, decreaseItem, addItem, removeItem, clearCart, totalPrice } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);

  if (!items.length) {
    return (
      <>
        <Header />
        <main className={styles.main}>
          <div className={styles.empty}>
            <div>
              <h1>{submittedOrder ? 'Заказ оформлен' : 'Корзина пуста'}</h1>
              {submittedOrder
                ? <p>Заказ № {submittedOrder.id} сохранён. Сумма: {Number(submittedOrder.total).toLocaleString('ru-RU')} сом.</p>
                : <p>Добавьте блюда из меню.</p>}
              <Link to="/menu">Перейти в меню</Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <h1 className={styles.heading}>Корзина</h1>
        <div className={styles.layout}>
          <div className={styles.items}>
            {items.map((item) => (
              <article className={styles.item} key={item.id}>
                {item.image_url
                  ? <img
                    src={getOptimizedMenuImageUrl(item.image_url)}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    width="640"
                    height="480"
                  />
                  : <div className={styles.imagePlaceholder}>Sushi Lab</div>}
                <div className={styles.itemInfo}>
                  <h2>{item.name}</h2>
                  <p>{Number(item.price).toLocaleString('ru-RU')} сом</p>
                </div>
                <div className={styles.controls}>
                  <div className={styles.quantity}>
                    <button type="button" onClick={() => decreaseItem(item.id)} aria-label="Уменьшить">−</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => addItem(item)} aria-label="Увеличить">+</button>
                  </div>
                  <button type="button" className={styles.remove} onClick={() => removeItem(item.id)}>Удалить</button>
                </div>
              </article>
            ))}
          </div>
          <aside className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Итого</span>
              <strong>{totalPrice.toLocaleString('ru-RU')} сом</strong>
            </div>
            <button type="button" className={styles.orderButton} onClick={() => setCheckoutOpen(true)}>Заказать</button>
          </aside>
        </div>
      </main>
      <CheckoutModal
        open={checkoutOpen}
        items={items}
        total={totalPrice}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={(order) => {
          setSubmittedOrder(order);
          clearCart();
          setCheckoutOpen(false);
        }}
      />
      <Footer />
    </>
  );
}

export default Cart;
