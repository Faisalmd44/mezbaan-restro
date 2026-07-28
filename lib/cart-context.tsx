import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import type { MenuItem, Coupon, Address, PaymentMethod, CartLineSnapshot } from './types';
import { useAuth } from './auth-context';

const CART_KEY = (uid: string | undefined) => `mezbaan_cart_${uid ?? 'guest'}`;

const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') return localStorage.getItem(key);
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
};

export type CartItem = {
  key: string;
  item: MenuItem;
  quantity: number;
  notes?: string;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  coupon: Coupon | null;
  couponCode: string | null;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  selectedAddress: Address | null;
  paymentMethod: PaymentMethod;
  orderNotes: string;
  addItem: (item: MenuItem, quantity?: number) => void;
  updateQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
  setSelectedAddress: (a: Address | null) => void;
  setPaymentMethod: (m: PaymentMethod) => void;
  setOrderNotes: (n: string) => void;
  freeDeliveryThreshold: number;
  taxRate: number;
  deliveryFeeBase: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const FREE_DELIVERY_THRESHOLD = 250;
export const DELIVERY_FEE_BASE = 30;
export const TAX_RATE = 5;

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [orderNotes, setOrderNotes] = useState('');

  useEffect(() => {
    const key = CART_KEY(user?.id);
    storage.getItem(key).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as { items: CartItem[]; couponCode: string | null };
        setItems(saved.items ?? []);
        setCouponCode(saved.couponCode ?? null);
      } catch { /* ignore */ }
    });
  }, [user?.id]);

  useEffect(() => {
    const key = CART_KEY(user?.id);
    storage.setItem(key, JSON.stringify({ items, couponCode }));
  }, [items, couponCode, user?.id]);

  const addItem = useCallback((item: MenuItem, quantity = 1) => {
    const key = item.id;
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) { return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + quantity } : i)); }
      return [...prev, { key, item, quantity }];
    });
  }, []);

  const updateQty = useCallback((key: string, qty: number) => {
    setItems((prev) => qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, quantity: qty } : i)));
  }, []);

  const removeItem = useCallback((key: string) => { setItems((prev) => prev.filter((i) => i.key !== key)); }, []);

  const clear = useCallback(() => { setItems([]); setCoupon(null); setCouponCode(null); setOrderNotes(''); }, []);

  const applyCoupon = useCallback((c: Coupon) => { setCoupon(c); setCouponCode(c.code); }, []);
  const removeCoupon = useCallback(() => { setCoupon(null); setCouponCode(null); }, []);

  const subtotal = items.reduce((sum, i) => sum + Number(i.item.price) * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  let discount = 0;
  if (coupon && subtotal >= Number(coupon.min_order)) {
    if (coupon.discount_type === 'percent') {
      discount = (subtotal * Number(coupon.discount_value)) / 100;
    } else { discount = Number(coupon.discount_value); }
    discount = Math.round(discount * 100) / 100;
  }
  const deliveryFee = subtotal === 0 || subtotal - discount >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE_BASE;
  const taxableBase = Math.max(0, subtotal - discount);
  const tax = Math.round(((taxableBase + deliveryFee) * TAX_RATE) / 100 * 100) / 100;
  const total = Math.max(0, taxableBase + deliveryFee + tax);

  const value: CartContextValue = {
    items, count, subtotal: Math.round(subtotal * 100) / 100,
    coupon, couponCode, discount, deliveryFee, tax, total, selectedAddress, paymentMethod, orderNotes,
    addItem, updateQty, removeItem, clear, applyCoupon, removeCoupon, setSelectedAddress, setPaymentMethod, setOrderNotes,
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD, taxRate: TAX_RATE, deliveryFeeBase: DELIVERY_FEE_BASE,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export function toSnapshots(items: CartItem[]): CartLineSnapshot[] {
  return items.map((i) => {
    const unit = Number(i.item.price);
    return {
      item_id: i.item.id, name: i.item.name, image_url: i.item.image,
      unit_price: unit, quantity: i.quantity,
      line_total: Math.round(unit * i.quantity * 100) / 100,
    };
  });
}
