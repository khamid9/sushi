import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header.jsx";
import Footer from "../../components/Footer/Footer.jsx";
import { apiUrl } from "../../lib/api.js";
import styles from "./Home.module.css";

function Home() {
  useEffect(() => {
    fetch(apiUrl("/api/health"), { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error(`API warm-up failed with status ${response.status}`);
    }).catch((error) => console.warn("Could not warm up the API", error));
  }, []);

  return (
    <>
      <Header />
      <main>
        <section className={styles.hero}>
          <div className={styles.content}>
            <p className={styles.eyebrow}>Свежая азиатская кухня</p>
            <h1>
              Роллы, в которые
              <br />
              влюбляются с первого укуса
            </h1>
            <p className={styles.description}>
              Авторские наборы, свежие продукты и доставка по Бишкеку.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryButton} to="/menu">
                Посмотреть меню
              </Link>
              <a className={styles.secondaryButton} href="#contacts">
                Контакты
              </a>
            </div>
          </div>
          <div
            className={styles.visual}
            role="img"
            aria-label="Ассорти из суши и роллов"
          >
            <div className={styles.offer}>
              Сет недели
              <br />
              <strong>-15%</strong>
            </div>
          </div>
        </section>

        <section className={styles.features} aria-label="Преимущества">
          <article>
            <strong>Fresh</strong>
            <span>Продукты каждый день</span>
          </article>
          <article>
            <strong>45 мин</strong>
            <span>Среднее время доставки</span>
          </article>
          <article>
            <strong>7 дней</strong>
            <span>Доставка без выходных</span>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default Home;
