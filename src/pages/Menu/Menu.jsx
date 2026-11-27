import { useEffect, useRef, useState } from 'react';
import Header from '../../components/Header/Header.jsx';
import Footer from '../../components/Footer/Footer.jsx';
import { useCart } from '../../context/CartContext.jsx';
import CartBar from './CartBar.jsx';
import styles from './Menu.module.css';
import { apiUrl } from '../../lib/api.js';
import { getOptimizedMenuImageUrl } from '../../lib/menuImages.js';
import { MENU_CACHE_KEY } from '../../lib/menuCache.js';
import { menuFallback } from '../../data/menuFallback.js';

const ADD_CLICK_COOLDOWN_MS = 1000;

function readMenuCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(MENU_CACHE_KEY) || 'null');
    return Array.isArray(cached?.categories) && Array.isArray(cached?.products) ? cached : null;
  } catch (error) {
    console.warn('Could not read the cached menu', error);
    return null;
  }
}

function Menu() {
  const [initialCache] = useState(() => readMenuCache() || menuFallback);
  const [categories, setCategories] = useState(initialCache?.categories || []);
  const [products, setProducts] = useState(initialCache?.products || []);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState('');
  const [cacheWarning, setCacheWarning] = useState(false);
  const [recentlyAddedIds, setRecentlyAddedIds] = useState(() => new Set());
  const addLocks = useRef(new Set());
  const addTimers = useRef(new Map());
  const hasCatalog = useRef(Boolean(initialCache));
  const { addItem, totalQuantity, totalPrice } = useCart();

  useEffect(() => {
    let active = true;
    let requestInFlight = false;
    let refreshRequested = false;
    const loadCatalog = async (refreshAfterCurrent = false) => {
      if (requestInFlight) {
        refreshRequested = refreshRequested || refreshAfterCurrent;
        return;
      }
      requestInFlight = true;
      try {
        const [categoryData, productData] = await Promise.all([
          fetch(apiUrl('/api/categories')).then((response) => {
            if (!response.ok) throw new Error('Не удалось загрузить категории');
            return response.json();
          }),
          fetch(apiUrl('/api/products')).then((response) => {
            if (!response.ok) throw new Error('Не удалось загрузить меню');
            return response.json();
          }),
        ]);
        if (!active) return;
        setCategories(categoryData);
        setProducts(productData);
        hasCatalog.current = true;
        setError('');
        setCacheWarning(false);
        try {
          localStorage.setItem(MENU_CACHE_KEY, JSON.stringify({
            categories: categoryData,
            products: productData,
          }));
        } catch (storageError) {
          console.warn('Could not cache the menu', storageError);
        }
      } catch (requestError) {
        if (!active) return;
        if (hasCatalog.current) setCacheWarning(true);
        else setError(requestError.message);
      } finally {
        requestInFlight = false;
        if (active) {
          if (refreshRequested) {
            refreshRequested = false;
            loadCatalog();
          }
        }
      }
    };
    const handleStorage = (event) => {
      if (event.key === MENU_CACHE_KEY && event.newValue === null) loadCatalog(true);
    };

    loadCatalog();
    window.addEventListener('focus', loadCatalog);
    window.addEventListener('storage', handleStorage);
    return () => {
      active = false;
      window.removeEventListener('focus', loadCatalog);
      window.removeEventListener('storage', handleStorage);
    };
  }, [initialCache]);

  useEffect(() => () => {
    addTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const query = search.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    const matchesSearch = !query || `${product.name} ${product.description || ''}`.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product) => {
    const productId = String(product.id);
    if (addLocks.current.has(productId)) return;
    addLocks.current.add(productId);
    addItem(product);
    setRecentlyAddedIds((current) => new Set(current).add(productId));
    const timer = window.setTimeout(() => {
      addLocks.current.delete(productId);
      addTimers.current.delete(productId);
      setRecentlyAddedIds((current) => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
    }, ADD_CLICK_COOLDOWN_MS);
    addTimers.current.set(productId, timer);
  };

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.heading}>
          <p>Полное меню</p>
          <h1>Выберите любимые блюда</h1>
        </div>

        {error && <div className={styles.state}>{error}</div>}
        {cacheWarning && <div className={styles.cacheWarning}>Не удалось обновить меню — показана сохранённая версия.</div>}

        {(!error || initialCache) && (
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
                          <button
                            type="button"
                            disabled={recentlyAddedIds.has(String(product.id))}
                            onClick={() => addToCart(product)}
                          >
                            {recentlyAddedIds.has(String(product.id)) ? 'Добавлено ✓' : 'Добавить'}
                          </button>
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
