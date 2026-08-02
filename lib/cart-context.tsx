import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import * as Application from 'expo-application';
import type { CartLineSnapshot, Product, ProductVariant, ProductAddon, Coupon, Address, PaymentMethod } from './types';
import { useAuth } from './auth-context';
import { supabase } from './supabase';

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
      /* ignore quota / privacy errors */
    }
  },
};

// Unique Hardware Device Identifier Fetcher
export const getDeviceId = async (): Promise<string> => {
  try {
    if (Platform.OS === 'android') {
      return Application.getAndroidId() || 'unknown_android_device';
    } else if (Platform.OS === 'ios') {
      return (await Application.getIosIdForVendorAsync()) || 'unknown_ios_device';
    }
  } catch (e) {
    console.log('Error fetching device ID:', e);
  }
  return 'web_or_unknown_device';
};

export type CartItem = {
  key: string;
  product: Product;
  variant: ProductVariant | null;
  addons: ProductAddon[];
  quantity: number;
  notes?: string;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addonsTotal: number;
  coupon: Coupon | null;
  couponCode: string | null;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  selectedAddress: Address | null;
  paymentMethod: PaymentMethod;
  orderNotes: string;
  addItem: (product: Product, variant: ProductVariant | null, addons: ProductAddon[], quantity?: number) => void;
  updateQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  applyCoupon: (coupon: Coupon) => Promise<boolean>;
  applyWelcomeCoupon: () => Promise<boolean>;
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

  const makeKey = (p: Product, v: ProductVariant | null, a: ProductAddon[]) =>
    [p.id, v?.id ?? 'base', a.map((x) => x.id).sort().join('+')].join('|');

  const addItem = useCallback((product: Product, variant: ProductVariant | null, addons: ProductAddon[], quantity = 1) => {
    const key = makeKey(product, variant, addons);
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) { return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + quantity } : i)); }
      return [...prev, { key, product, variant, addons, quantity }];
    });
  }, []);

  const updateQty = useCallback((key: string, qty: number) => {
    setItems((prev) => qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, quantity: qty } : i)));
  }, []);

  const removeItem = useCallback((key: string) => { setItems((prev) => prev.filter((i) => i.key !== key)); }, []);
  const clear = useCallback(() => { setItems([]); setCoupon(null); setCouponCode(null); setOrderNotes(''); }, []);

  // Standard Coupon Application Router
  const applyCoupon = useCallback(async (c: Coupon) => {
    if (c.code.toUpperCase() === 'WELCOME15') {
      return await applyWelcomeCoupon();
    }
    setCoupon(c);
    setCouponCode(c.code);
    return true;
  }, [user?.id]);

  // Anti-Abuse WELCOME15 Coupon (1 per physical Device + Account lock)
  const applyWelcomeCoupon = useCallback(async (): Promise<boolean> => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to claim WELCOME15 coupon.');
      return false;
    }

    try {
      const deviceId = await getDeviceId();

      // 1. Check if physical DEVICE has ever used WELCOME15
      const { data: deviceOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('device_id', deviceId)
        .eq('coupon_code', 'WELCOME15')
        .limit(1);

      if (deviceOrders && deviceOrders.length > 0) {
        Alert.alert(
          'Offer Already Claimed 🛑',
          'WELCOME15 has already been used on this phone/device! New accounts on the same device are not eligible.'
        );
        return false;
      }

      // 2. Check if USER ACCOUNT has ever used WELCOME15
      const { data: userOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('coupon_code', 'WELCOME15')
        .limit(1);

      if (userOrders && userOrders.length > 0) {
        Alert.alert('Coupon Already Used', 'You have already used WELCOME15 on this account.');
        return false;
      }

      const welcomeCouponObj: Coupon = {
        id: 'welcome15',
        code: 'WELCOME15',
        discount_type: 'percent',
        discount_value: 15,
        min_order: 0,
        max_discount: 100,
        is_active: true,
      };

      setCoupon(welcomeCouponObj);
      setCouponCode('WELCOME15');
      Alert.alert('Success 🎉', 'WELCOME15 Applied! 15% discount added to your cart.');
      return true;

    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to validate coupon.');
      return false;
    }
  }, [user]);

  const removeCoupon = useCallback(() => { setCoupon(null); setCouponCode(null); }, []);

  const addonsTotal = items.reduce((sum, i) => sum + i.addons.reduce((s, a) => s + Number(a.price), 0) * i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + (Number(i.variant?.price ?? i.product.price) + i.addons.reduce((s, a) => s + Number(a.price), 0)) * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  let discount = 0;
  if (coupon && subtotal >= Number(coupon.min_order)) {
    if (coupon.discount_type === 'percent') {
      discount = (subtotal * Number(coupon.discount_value)) / 100;
      if (coupon.max_discount > 0) discount = Math.min(discount, Number(coupon.max_discount));
    } else { discount = Number(coupon.discount_value); }
    discount = Math.round(discount * 100) / 100;
  }
  const deliveryFee = subtotal === 0 || subtotal - discount >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE_BASE;
  const taxableBase = Math.max(0, subtotal - discount);
  const tax = Math.round(((taxableBase + deliveryFee) * TAX_RATE) / 100 * 100) / 100;
  const total = Math.max(0, taxableBase + deliveryFee + tax);

  const value: CartContextValue = {
    items, count, subtotal: Math.round(subtotal * 100) / 100, addonsTotal: Math.round(addonsTotal * 100) / 100,
    coupon, couponCode, discount, deliveryFee, tax, total, selectedAddress, paymentMethod, orderNotes,
    addItem, updateQty, removeItem, clear, applyCoupon, applyWelcomeCoupon, removeCoupon, setSelectedAddress, setPaymentMethod, setOrderNotes,
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
    const base = Number(i.variant?.price ?? i.product.price);
    const addonsTotal = i.addons.reduce((s, a) => s + Number(a.price), 0);
    const unit = base + addonsTotal;
    return {
      product_id: i.product.id, name: i.product.name, image_url: i.product.image_url,
      base_price: base, unit_price: unit, quantity: i.quantity,
      variant_id: i.variant?.id ?? null, variant_name: i.variant?.name ?? null,
      addon_ids: i.addons.map((a) => a.id), addon_names: i.addons.map((a) => a.name),
      addons_total: addonsTotal, line_total: Math.round(unit * i.quantity * 100) / 100,
    };
  });
}

