import styles from "./Footer.module.css";

function Footer() {
  return (
    <footer className={styles.footer} id="contacts">
      <div className={styles.inner}>
        <div>
          <strong>Sushi Lab</strong>
          <p>Свежие роллы и сеты с доставкой.</p>
        </div>
        <div className={styles.meta}>
          <span>Бишкек</span>
          <span>Ежедневно: 10:00–23:00</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
