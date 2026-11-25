import { Link } from 'react-router-dom';
import styles from './CartBar.module.css';

function CartBar({ quantity, total }) {
  if (!quantity) return null;

  return (
    <Link className={styles.bar} to="/cart" aria-label="Перейти в корзину">
      <span>Корзина · {quantity} шт.</span>
      <strong>{total.toLocaleString('ru-RU')} сом</strong>
    </Link>
  );
}

export default CartBar;
