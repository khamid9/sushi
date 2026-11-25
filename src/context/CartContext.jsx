import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const CART_KEY = 'sushi-cart';
const MAX_QUANTITY = 99;

function normalizeCart(value) {
  if (!Array.isArray(value)) return [];

  const merged = new Map();
  value.forEach((item) => {
    if (!item || typeof item !== 'object' || !item.id) return;
    const id = String(item.id);
    const price = Number(item.price);
    if (!Number.isFinite(price) || price < 0) return;

    const quantity = Math.min(MAX_QUANTITY, Math.max(1, Math.floor(Number(item.quantity) || 1)));
    const existing = merged.get(id);
    if (existing) {
      existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity);
    } else {
      merged.set(id, { ...item, id, price, quantity });
    }
  });
  return [...merged.values()];
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return normalizeCart(JSON.parse(localStorage.getItem(CART_KEY) || '[]'));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // Cart remains usable in memory when storage is unavailable.
    }
  }, [items]);

  const addItem = (product) => {
    if (!product?.id || product?.is_available === false) return;
    setItems((current) => {
      const existing = current.find((item) => item.id === String(product.id));
      if (existing) {
        return current.map((item) => item.id === String(product.id)
          ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + 1) }
          : item);
      }
      const price = Number(product.price);
      if (!Number.isFinite(price) || price < 0) return current;
      return [...current, { ...product, id: String(product.id), price, quantity: 1 }];
    });
  };

  const setQuantity = (productId, quantity) => {
    const nextQuantity = Math.floor(Number(quantity));
    setItems((current) => {
      if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
        return current.filter((item) => item.id !== String(productId));
      }
      return current.map((item) => item.id === String(productId)
        ? { ...item, quantity: Math.min(MAX_QUANTITY, nextQuantity) }
        : item);
    });
  };

  const decreaseItem = (productId) => {
    setItems((current) => current
      .map((item) => item.id === String(productId)
        ? { ...item, quantity: item.quantity - 1 }
        : item)
      .filter((item) => item.quantity > 0));
  };

  const removeItem = (productId) => {
    setItems((current) => current.filter((item) => item.id !== String(productId)));
  };

  const clearCart = () => setItems([]);

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  return (
    <CartContext.Provider value={{ items, addItem, setQuantity, decreaseItem, removeItem, clearCart, totalQuantity, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
