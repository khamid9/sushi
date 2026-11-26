import { useEffect, useRef, useState } from 'react';
import styles from './Admin.module.css';
import { apiUrl } from '../../lib/api.js';
import { invalidateMenuCache } from '../../lib/menuCache.js';

const api = async (path, options = {}, token = '') => {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || 'Ошибка запроса');
  return data;
};

function base64UrlToBytes(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem('admin-token') || '');
  const [login, setLogin] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [section, setSection] = useState(() => {
    const requestedSection = new URLSearchParams(window.location.search).get('section');
    return ['dashboard', 'products', 'categories', 'orders'].includes(requestedSection)
      ? requestedSection
      : 'dashboard';
  });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [pushPublicKey, setPushPublicKey] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushMessage, setPushMessage] = useState('');
  const [pushError, setPushError] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [updatingOrderIds, setUpdatingOrderIds] = useState(() => new Set());
  const ordersRevision = useRef(0);
  const pendingOrderUpdates = useRef(new Set());
  const savingProductRef = useRef(false);
  const savingCategoryRef = useRef(false);

  const logout = () => {
    localStorage.removeItem('admin-token');
    setToken('');
  };

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [categoryData, productData, orderData] = await Promise.all([
        api('/api/admin/categories', {}, token),
        api('/api/admin/products', {}, token),
        api('/api/admin/orders', {}, token),
      ]);
      setCategories(categoryData);
      setProducts(productData);
      setOrders(orderData);
    } catch (requestError) {
      if (requestError.message.includes('токен') || requestError.message.includes('Authorization')) logout();
      else setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  useEffect(() => {
    if (!token || loading) return undefined;

    let active = true;
    let requestInFlight = false;
    const refreshOrders = async () => {
      if (
        !active
        || requestInFlight
        || pendingOrderUpdates.current.size
        || document.visibilityState !== 'visible'
      ) return;
      const requestRevision = ordersRevision.current;
      requestInFlight = true;
      try {
        const orderData = await api('/api/admin/orders', {}, token);
        if (active && requestRevision === ordersRevision.current) setOrders(orderData);
      } catch (requestError) {
        if (!active) return;
        if (requestError.message.includes('токен') || requestError.message.includes('Authorization')) logout();
        else setError(requestError.message);
      } finally {
        requestInFlight = false;
      }
    };

    const handleVisible = () => {
      if (document.visibilityState === 'visible') refreshOrders();
    };
    const intervalId = window.setInterval(refreshOrders, 15000);
    window.addEventListener('focus', handleVisible);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisible);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [token, loading]);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    api('/api/admin/push/vapid-public-key', {}, token)
      .then((data) => {
        if (active) setPushPublicKey(data.public_key);
      })
      .catch((requestError) => {
        if (active) {
          setPushError(true);
          setPushMessage(requestError.message.includes('Push-уведомления не настроены')
            ? 'На сервере не настроены VAPID-ключи. Добавьте VAPID_PUBLIC_KEY и VAPID_PRIVATE_KEY в Render.'
            : requestError.message);
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !pushPublicKey || !('serviceWorker' in navigator)) return undefined;
    let active = true;
    navigator.serviceWorker.ready
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription || !active) return;
        await api('/api/admin/push-subscriptions', {
          method: 'POST',
          body: JSON.stringify(subscription.toJSON()),
        }, token);
        if (active) setPushEnabled(true);
      })
      .catch((requestError) => {
        if (active) {
          setPushError(true);
          setPushMessage(requestError.message);
        }
      });
    return () => {
      active = false;
    };
  }, [token, pushPublicKey]);

  const enablePushNotifications = async () => {
    setPushLoading(true);
    setPushError(false);
    setPushMessage('');
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        throw new Error('Этот браузер не поддерживает push-уведомления');
      }
      if (!pushPublicKey) throw new Error('VAPID-ключи не настроены на сервере');
      if (Notification.permission === 'denied') {
        throw new Error('Разрешите уведомления для сайта в настройках браузера');
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Разрешите уведомления для этого сайта');

      const registration = await navigator.serviceWorker.register('/sw.js');
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription = existingSubscription || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(pushPublicKey),
      });
      await api('/api/admin/push-subscriptions', {
        method: 'POST',
        body: JSON.stringify(subscription.toJSON()),
      }, token);
      setPushEnabled(true);
      setPushMessage('Уведомления включены на этом устройстве.');
    } catch (requestError) {
      setPushError(true);
      setPushMessage(requestError.message || 'Не удалось включить уведомления');
    } finally {
      setPushLoading(false);
    }
  };

  const disablePushNotifications = async () => {
    setPushLoading(true);
    setPushError(false);
    setPushMessage('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        setPushEnabled(false);
        await api('/api/admin/push-subscriptions', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint }),
        }, token);
      }
      setPushEnabled(false);
      setPushMessage('Уведомления выключены на этом устройстве.');
    } catch (requestError) {
      setPushError(true);
      setPushMessage(requestError.message || 'Не удалось выключить уведомления');
    } finally {
      setPushLoading(false);
    }
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    setLoginError('');
    try {
      const data = await api('/api/admin/login', { method: 'POST', body: JSON.stringify(login) });
      localStorage.setItem('admin-token', data.access_token);
      setToken(data.access_token);
    } catch (requestError) {
      setLoginError(requestError.message);
    }
  };

  if (!token) {
    return (
      <main className={styles.loginPage}>
        <form className={styles.loginCard} onSubmit={submitLogin}>
          <span className={styles.brandMark}>S</span>
          <h1>Админ-панель</h1>
          <p>Вход для управления Sushi Lab</p>
          <label>Логин<input value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} autoComplete="username" /></label>
          <label>Пароль<input type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} autoComplete="current-password" /></label>
          {loginError && <div className={styles.error}>{loginError}</div>}
          <button type="submit">Войти</button>
        </form>
      </main>
    );
  }

  const saveCategory = async (event) => {
    event.preventDefault();
    if (savingCategoryRef.current) return;
    savingCategoryRef.current = true;
    setSavingCategory(true);
    try {
      const form = new FormData(event.currentTarget);
      const payload = {
        name: form.get('name').trim(),
        description: form.get('description').trim(),
        image_url: form.get('image_url').trim() || null,
        is_active: form.has('is_active'),
        sort_order: Number(form.get('sort_order') || 0),
      };
      if (editingCategory?.id) await api(`/api/admin/categories/${editingCategory.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
      else await api('/api/admin/categories', { method: 'POST', body: JSON.stringify(payload) }, token);
      invalidateMenuCache();
      setEditingCategory(null);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      savingCategoryRef.current = false;
      setSavingCategory(false);
    }
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    if (savingProductRef.current) return;
    savingProductRef.current = true;
    setSavingProduct(true);
    try {
      const form = new FormData(event.currentTarget);
      const imageFile = form.get('image');
      let imageUrl = form.get('image_url')?.trim() || null;
      if (imageFile instanceof File && imageFile.size) {
        const upload = new FormData();
        upload.append('file', imageFile);
        const data = await api('/api/admin/upload', { method: 'POST', body: upload }, token);
        imageUrl = data.url;
      }
      const payload = {
        category_id: form.get('category_id'),
        name: form.get('name').trim(),
        description: form.get('description').trim(),
        price: Number(form.get('price')),
        weight: form.get('weight').trim() || null,
        image_url: imageUrl,
        is_available: form.has('is_available'),
        is_featured: form.has('is_featured'),
      };
      if (editingProduct?.id) await api(`/api/admin/products/${editingProduct.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
      else await api('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) }, token);
      invalidateMenuCache();
      setEditingProduct(null);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      savingProductRef.current = false;
      setSavingProduct(false);
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!window.confirm('Удалить категорию?')) return;
    try {
      await api(`/api/admin/categories/${categoryId}`, { method: 'DELETE' }, token);
      invalidateMenuCache();
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('Удалить товар?')) return;
    try {
      await api(`/api/admin/products/${productId}`, { method: 'DELETE' }, token);
      invalidateMenuCache();
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const changeStatus = async (orderId, status) => {
    const previousOrder = orders.find((order) => order.id === orderId);
    if (!previousOrder || pendingOrderUpdates.current.has(orderId)) return;

    ordersRevision.current += 1;
    pendingOrderUpdates.current.add(orderId);
    setUpdatingOrderIds((current) => new Set(current).add(orderId));
    setError('');
    setOrders((current) => status === 'done'
      ? current.filter((order) => order.id !== orderId)
      : current.map((order) => order.id === orderId ? { ...order, status } : order));

    try {
      const updatedOrder = await api(
        `/api/admin/orders/${orderId}/status`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
        token,
      );
      if (updatedOrder.status === 'done') {
        setOrders((current) => current.filter((order) => order.id !== orderId));
      } else {
        setOrders((current) => current.map((order) => order.id === orderId ? updatedOrder : order));
      }
    } catch (requestError) {
      ordersRevision.current += 1;
      setOrders((current) => {
        if (status !== 'done') {
          return current.map((order) => order.id === orderId ? previousOrder : order);
        }
        return [...current.filter((order) => order.id !== orderId), previousOrder]
          .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
      });
      if (requestError.message.includes('токен') || requestError.message.includes('Authorization')) logout();
      else setError(requestError.message);
    } finally {
      pendingOrderUpdates.current.delete(orderId);
      setUpdatingOrderIds((current) => {
        const next = new Set(current);
        next.delete(orderId);
        return next;
      });
    }
  };

  const statusLabels = {
    new: 'Новый', accepted: 'Подтверждён', cooking: 'Готовится', delivering: 'Передан курьеру', done: 'Доставлен', cancelled: 'Отменён',
  };

  const newOrders = orders.filter((order) => order.status === 'new').length;

  return (
    <main className={styles.adminShell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}><span>S</span><strong>Sushi Lab</strong></div>
        <nav>
          <button className={section === 'dashboard' ? styles.active : ''} onClick={() => setSection('dashboard')}>Дашборд</button>
          <button className={section === 'products' ? styles.active : ''} onClick={() => setSection('products')}>Товары</button>
          <button className={section === 'categories' ? styles.active : ''} onClick={() => setSection('categories')}>Категории</button>
          <button className={section === 'orders' ? styles.active : ''} onClick={() => setSection('orders')}>Заказы <b>{newOrders}</b></button>
        </nav>
        <button className={styles.logout} onClick={logout}>Выйти</button>
      </aside>
      <section className={styles.content}>
        {loading && <div className={styles.state}>Загрузка...</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!loading && section === 'dashboard' && (
          <>
            <div className={styles.titleRow}>
              <h1>Дашборд</h1>
              <button
                type="button"
                onClick={pushEnabled ? disablePushNotifications : enablePushNotifications}
                disabled={pushLoading || !pushPublicKey}
              >
                {pushLoading ? 'Подключаем...' : pushEnabled ? 'Выключить уведомления' : 'Включить уведомления'}
              </button>
            </div>
            {pushMessage && <p className={pushError ? styles.error : styles.pushMessage}>{pushMessage}</p>}
            <div className={styles.stats}>
              <article><span>Товары</span><strong>{products.length}</strong></article>
              <article><span>Категории</span><strong>{categories.length}</strong></article>
              <article><span>Заказы</span><strong>{orders.length}</strong></article>
              <article><span>Новые</span><strong>{newOrders}</strong></article>
            </div>
          </>
        )}
        {!loading && section === 'categories' && (
          <>
            <div className={styles.titleRow}><h1>Категории</h1><button onClick={() => setEditingCategory({})}>Добавить</button></div>
            {editingCategory && (
              <form className={styles.form} onSubmit={saveCategory}>
                <label>Название<input name="name" defaultValue={editingCategory.name || ''} required /></label>
                <label>Описание<input name="description" defaultValue={editingCategory.description || ''} /></label>
                <label>URL изображения<input name="image_url" defaultValue={editingCategory.image_url || ''} /></label>
                <label>Порядок<input name="sort_order" type="number" defaultValue={editingCategory.sort_order || 0} /></label>
                <label className={styles.check}><input name="is_active" type="checkbox" defaultChecked={editingCategory.is_active !== false} /> Активна</label>
                <div className={styles.actions}><button type="button" disabled={savingCategory} onClick={() => setEditingCategory(null)}>Отмена</button><button type="submit" disabled={savingCategory}>{savingCategory ? 'Сохраняем...' : 'Сохранить'}</button></div>
              </form>
            )}
            <div className={styles.tableWrap}><table><thead><tr><th>Название</th><th>Порядок</th><th>Статус</th><th /></tr></thead><tbody>{categories.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.sort_order}</td><td>{item.is_active ? 'Активна' : 'Скрыта'}</td><td className={styles.rowActions}><button onClick={() => setEditingCategory(item)}>Изменить</button><button onClick={() => deleteCategory(item.id)}>Удалить</button></td></tr>)}</tbody></table></div>
          </>
        )}
        {!loading && section === 'products' && (
          <>
            <div className={styles.titleRow}><h1>Товары</h1><button onClick={() => setEditingProduct({})}>Добавить</button></div>
            {editingProduct && (
              <form className={styles.form} onSubmit={saveProduct}>
                <label>Название<input name="name" defaultValue={editingProduct.name || ''} required /></label>
                <label>Категория<select name="category_id" defaultValue={editingProduct.category_id || categories[0]?.id}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label>Описание<textarea name="description" defaultValue={editingProduct.description || ''} rows="3" /></label>
                <label>Цена<input name="price" type="number" min="0" step="1" defaultValue={editingProduct.price || ''} required /></label>
                <label>Вес/объем<input name="weight" defaultValue={editingProduct.weight || ''} /></label>
                <label>Изображение (URL)<input name="image_url" defaultValue={editingProduct.image_url || ''} /></label>
                <label>Загрузить фото<input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label>
                <label className={styles.check}><input name="is_available" type="checkbox" defaultChecked={editingProduct.is_available !== false} /> В наличии</label>
                <label className={styles.check}><input name="is_featured" type="checkbox" defaultChecked={Boolean(editingProduct.is_featured)} /> Популярный товар</label>
                <div className={styles.actions}><button type="button" disabled={savingProduct} onClick={() => setEditingProduct(null)}>Отмена</button><button type="submit" disabled={savingProduct}>{savingProduct ? 'Сохраняем...' : 'Сохранить'}</button></div>
              </form>
            )}
            <div className={styles.tableWrap}><table><thead><tr><th>Товар</th><th>Цена</th><th>Вес</th><th>Статус</th><th /></tr></thead><tbody>{products.map((item) => <tr key={item.id}><td>{item.name}</td><td>{Number(item.price).toLocaleString('ru-RU')} сом</td><td>{item.weight || '—'}</td><td>{item.is_available ? 'В наличии' : 'Нет'}</td><td className={styles.rowActions}><button onClick={() => setEditingProduct(item)}>Изменить</button><button onClick={() => deleteProduct(item.id)}>Удалить</button></td></tr>)}</tbody></table></div>
          </>
        )}
        {!loading && section === 'orders' && (
          <>
            <div className={styles.titleRow}>
              <div>
                <h1>Заказы</h1>
                <p className={styles.refreshHint}>Автообновление каждые 15 секунд</p>
              </div>
            </div>
            <div className={styles.orders}>{orders.length ? orders.map((order) => (
              <article className={styles.order} key={order.id}>
                <div><strong>{order.customer_name}</strong><span>{order.phone}</span></div>
                <p>{order.address || 'Адрес не указан'}</p>
                <p>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</p>
                <strong>{Number(order.total).toLocaleString('ru-RU')} сом</strong>
                <select value={order.status} disabled={updatingOrderIds.has(order.id)} onChange={(event) => changeStatus(order.id, event.target.value)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              </article>
            )) : <div className={styles.state}>Заказов пока нет</div>}</div>
          </>
        )}
      </section>
    </main>
  );
}

export default Admin;
