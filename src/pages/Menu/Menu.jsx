import { useEffect, useState } from 'react';
import Header from '../../components/Header/Header.jsx';
import Footer from '../../components/Footer/Footer.jsx';
import { useCart } from '../../context/CartContext.jsx';
import CartBar from './CartBar.jsx';
import styles from './Menu.module.css';
import { apiUrl } from '../../lib/api.js';
import { getOptimizedMenuImageUrl } from '../../lib/menuImages.js';

function Menu() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addItem, totalQuantity, totalPrice } = useCart();

  useEffect(() => {
    Promise.all([
      fetch(apiUrl('/api/categories')).then((response) => {
        if (!response.ok) throw new Error('Не удалось загрузить категории');
        return response.json();
      }),
      fetch(apiUrl('/api/products')).then((response) => {
        if (!response.ok) throw new Error('Не удалось загрузить меню');
        return response.json();
      }),
    ]).then(([categoryData, productData]) => {
      setCategories(categoryData);
      setProducts(productData);
    }).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false));
  }, []);

  const query = search.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    const matchesSearch = !query || `${product.name} ${product.description || ''}`.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product) => {
    addItem(product);
  };

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.heading}>
          <p>Полное меню</p>
          <h1>Выберите любимые блюда</h1>
        </div>

        {loading && <div className={styles.state}>Загрузка меню...</div>}
        {error && <div className={styles.state}>{error}</div>}

        {!loading && !error && (
          <>
            <div className={styles.toolbar}>
              <label className={styles.search}>
                <span className={styles.srOnly}>Поиск блюд</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Поиск по меню"
                />
              </label>
            </div>

            <div className={styles.categories} aria-label="Категории меню">
              <button
                type="button"
                className={selectedCategory === 'all' ? styles.activeCategory : ''}
                onClick={() => setSelectedCategory('all')}
              >
                Все
              </button>
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  className={selectedCategory === category.id ? styles.activeCategory : ''}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {visibleProducts.length ? (
              <div className={styles.grid}>
                {visibleProducts.map((product, index) => {
                  const imageUrl = getOptimizedMenuImageUrl(product.image_url);
                  return (
                    <article className={styles.card} key={product.id}>
                      <button
                        type="button"
                        className={styles.imageButton}
                        onClick={() => setSelectedProduct(product)}
                        aria-label={`Подробнее о ${product.name}`}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.name}
                            loading={index < 3 ? 'eager' : 'lazy'}
                            fetchPriority={index === 0 ? 'high' : undefined}
                            decoding="async"
                            width="640"
                            height="480"
                          />
                        ) : (
                          <div className={styles.placeholder}>Sushi Lab</div>
                        )}
                      </button>
                      <div className={styles.info}>
                        <h2>{product.name}</h2>
                        <p>{product.description}</p>
                        {product.weight && <span className={styles.weight}>{product.weight}</span>}
                        <div className={styles.bottom}>
                          <strong>{Number(product.price).toLocaleString('ru-RU')} сом</strong>
                          <button type="button" onClick={() => addToCart(product)}>Добавить</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.state}>По вашему запросу ничего не найдено</div>
            )}

            {selectedProduct && (
              <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSelectedProduct(null);
              }}>
                <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="product-title">
                  <button type="button" className={styles.modalClose} onClick={() => setSelectedProduct(null)} aria-label="Закрыть">×</button>
                  {selectedProduct.image_url && (
                    <img
                      src={getOptimizedMenuImageUrl(selectedProduct.image_url)}
                      alt={selectedProduct.name}
                      decoding="async"
                      width="960"
                      height="720"
                    />
                  )}
                  <div className={styles.modalBody}>
                    <h2 id="product-title">{selectedProduct.name}</h2>
                    {selectedProduct.weight && <span>{selectedProduct.weight}</span>}
                    <p>{selectedProduct.description || 'Описание скоро появится.'}</p>
                    <div className={styles.modalBottom}>
                      <strong>{Number(selectedProduct.price).toLocaleString('ru-RU')} сом</strong>
                      <button type="button" onClick={() => {
                        addToCart(selectedProduct);
                        setSelectedProduct(null);
                      }}>Добавить в корзину</button>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </main>
      <CartBar quantity={totalQuantity} total={totalPrice} />
      <Footer />
    </>
  );
}

export default Menu;
