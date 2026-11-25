import { useEffect, useState } from 'react';
import styles from './CheckoutModal.module.css';
import { apiUrl } from '../../lib/api.js';

const EMPTY_FORM = { name: '', phone: '', address: '', comment: '' };

function normalizePhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('996') && digits.length === 12) digits = digits.slice(3);
  else if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  return digits.length === 9 ? `+996${digits}` : '';
}

function formatPhone(value) {
  const phone = normalizePhone(value);
  return phone
    ? `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 10)} ${phone.slice(10)}`
    : value;
}

function CheckoutModal({ open, items, total, onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const formatPhoneField = () => {
    setForm((current) => ({ ...current, phone: formatPhone(current.phone) }));
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Укажите имя';
    if (!normalizePhone(form.phone)) next.phone = 'Укажите номер в формате +996 XXX XXX XXX';
    if (form.address.trim().length < 5) next.address = 'Укажите адрес доставки';
    return next;
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = validate();
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    if (!items.length) {
      setSubmitError('Корзина пуста');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const response = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name.trim(),
          customer_phone: normalizePhone(form.phone),
          address: form.address.trim(),
          comment: form.comment.trim(),
          items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.detail || 'Не удалось оформить заказ');
      onSuccess(data);
      setForm(EMPTY_FORM);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <div className={styles.header}>
          <div>
            <p>Оформление доставки</p>
            <h2 id="checkout-title">Данные клиента</h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">×</button>
        </div>
        <form onSubmit={submit} noValidate>
          <label>
            Имя
            <input name="name" value={form.name} onChange={updateField} placeholder="Введите ваше имя" autoComplete="name" />
            {errors.name && <span className={styles.error}>{errors.name}</span>}
          </label>
          <label>
            Номер телефона
            <input name="phone" type="tel" value={form.phone} onChange={updateField} onBlur={formatPhoneField} placeholder="+996 XXX XXX XXX" inputMode="tel" autoComplete="tel" />
            {errors.phone && <span className={styles.error}>{errors.phone}</span>}
          </label>
          <label>
            Адрес доставки
            <input name="address" value={form.address} onChange={updateField} placeholder="Улица, дом, квартира" autoComplete="street-address" />
            {errors.address && <span className={styles.error}>{errors.address}</span>}
          </label>
          <label>
            Комментарий
            <textarea name="comment" value={form.comment} onChange={updateField} placeholder="Дополнительная информация" rows="3" />
          </label>
          {submitError && <div className={styles.submitError}>{submitError}</div>}
          <div className={styles.footer}>
            <div><span>Итого</span><strong>{total.toLocaleString('ru-RU')} сом</strong></div>
            <button type="submit" disabled={submitting}>{submitting ? 'Оформляем...' : 'Оформить заказ'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default CheckoutModal;
