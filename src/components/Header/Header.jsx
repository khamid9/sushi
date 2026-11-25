import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import styles from './Header.module.css';

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalQuantity } = useCart();

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link
          to="/"
          className={styles.brand}
          onClick={closeMenu}
          aria-label="На главную"
        >
          <span className={styles.mark}>S</span>
          <span className={styles.name}>Sushi Lab</span>
        </Link>

        <button
          className={styles.menuButton}
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>

        <nav
          className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`}
          aria-label="Основная навигация"
        >
          <NavLink to="/" end onClick={closeMenu}>
            Главная
          </NavLink>
          <NavLink to="/menu" onClick={closeMenu}>
            Меню
          </NavLink>
          <a href="#contacts" onClick={closeMenu}>
            Контакты
          </a>
          <Link to="/cart" className={styles.cartLink} onClick={closeMenu}>
            Корзина <span className={styles.cartCount}>{totalQuantity}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
