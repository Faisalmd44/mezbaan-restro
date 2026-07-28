import { supabase } from './supabase';
import type {
  MenuItem,
  Coupon,
  Address,
  Favorite,
  Order,
  OrderStatus,
  PaymentMethod,
  CartLineSnapshot,
  Wallet,
  WalletTransaction,
  AppNotification,
  Payment,
  RazorpayCreateOrderResponse,
  RazorpayVerifyResponse,
} from './types';

/* ---------------- Catalog (public, readable by anon) ---------------- */

export async function fetchMenuItems(opts?: {
  category?: string;
  search?: string;
  vegOnly?: boolean;
  bestsellerOnly?: boolean;
  limit?: number;
}): Promise<MenuItem[]> {
  let q = supabase
    .from('menu_items')
    .select('*')
    .eq('in_stock', true)
    .order('created_at', { ascending: false });
  if (opts?.category && opts.category !== 'All') q = q.eq('category', opts.category);
  if (opts?.vegOnly) q = q.eq('is_veg', true);
  if (opts?.bestsellerOnly) q = q.eq('is_bestseller', true);
  if (opts?.search) q = q.ilike('name', `%${opts.search}%`);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MenuItem[];
}

export async function fetchMenuItemById(id: string): Promise<MenuItem | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as MenuItem | null;
}

export async function fetchSimilarItems(itemId: string, category: string, limit = 6): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('category', category)
    .eq('in_stock', true)
    .neq('id', itemId)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as MenuItem[];
}

export async function fetchCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('category')
    .eq('in_stock', true);
  if (error) throw error;
  const cats = new Set((data ?? []).map((r: { category: string }) => r.category));
  return Array.from(cats).sort();
}

export async function fetchBestsellers(limit = 10): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('in_stock', true)
    .eq('is_bestseller', true)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as MenuItem[];
}

export async function fetchCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('active', true)
    .order('min_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Coupon[];
}

export async function validateCoupon(code: string, subtotal: number): Promise<{ coupon: Coupon | null; error: string | null }> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { coupon: null, error: 'Invalid coupon code' };
  const c = data as Coupon;
  if (subtotal < Number(c.min_order)) {
    return { coupon: null, error: `Minimum order ₹${c.min_order} required for this coupon` };
  }
  return { coupon: c, error: null };
}

/* ---------------- Addresses (owner-scoped) ---------------- */

export async function fetchAddresses(): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Address[];
}

export async function addAddress(input: {
  label: string;
  line: string;
  is_default?: boolean;
}): Promise<Address> {
  if (input.is_default) {
    await supabase.from('addresses').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  }
  const { data, error } = await supabase
    .from('addresses')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Address;
}

export async function updateAddress(id: string, patch: Partial<Address>): Promise<void> {
  const { error } = await supabase.from('addresses').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from('addresses').delete().eq('id', id);
  if (error) throw error;
}

/* ---------------- Favorites (owner-scoped) ---------------- */

export async function fetchFavorites(): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('*, menu_item:menu_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Favorite[];
}

export async function fetchFavoriteItemIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('favorites').select('item_id');
  if (error) throw error;
  return new Set((data ?? []).map((r: { item_id: string }) => r.item_id));
}

export async function toggleFavorite(itemId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('item_id', itemId)
    .maybeSingle();
  if (existing) {
    await supabase.from('favorites').delete().eq('id', (existing as { id: string }).id);
    return false;
  }
  const { error } = await supabase.from('favorites').insert({ item_id: itemId });
  if (error) throw error;
  return true;
}

/* ---------------- Orders (owner-scoped) ---------------- */

export async function placeOrder(input: {
  items: CartLineSnapshot[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total: number;
  coupon_code: string | null;
  payment_method: PaymentMethod;
  user_name: string;
  user_phone: string;
  address: string;
  notes?: string;
}): Promise<Order> {
  const orderNo = `MEZ-${Date.now()}`;
  const payload = {
    order_no: orderNo,
    status: 'received' as OrderStatus,
    subtotal: input.subtotal,
    discount: input.discount,
    delivery_fee: input.delivery_fee,
    tax: input.tax,
    total: input.total,
    coupon_code: input.coupon_code,
    payment_method: input.payment_method,
    payment_status: 'pending' as const,
    user_name: input.user_name,
    user_phone: input.user_phone,
    address: input.address,
    notes: input.notes ?? null,
    status_history: [{ status: 'received' as OrderStatus, at: new Date().toISOString() }],
  };
  const { data, error } = await supabase.from('orders').insert(payload).select().single();
  if (error) throw error;
  const order = data as Order;

  if (input.items.length) {
    const rows = input.items.map((i) => ({
      order_id: order.id,
      item_id: i.item_id,
      name: i.name,
      image_url: i.image_url,
      price: i.unit_price,
      quantity: i.quantity,
    }));
    await supabase.from('order_items').insert(rows);
  }

  await supabase.from('notifications').insert({
    type: 'order',
    title: 'Order Placed',
    body: `Your order ${orderNo} has been received.`,
    data: { order_id: order.id, order_no: orderNo },
  });

  return order;
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function fetchOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Order | null;
}

export async function cancelOrder(id: string): Promise<void> {
  const { data: order } = await supabase.from('orders').select('status_history').eq('id', id).maybeSingle();
  const history = (order as { status_history: { status: string; at: string }[] } | null)?.status_history ?? [];
  history.push({ status: 'cancelled', at: new Date().toISOString() });
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', status_history: history })
    .eq('id', id);
  if (error) throw error;
}

/* ---------------- Wallet (owner-scoped, read-only balance) ---------------- */

export async function fetchWallet(): Promise<Wallet | null> {
  const { data, error } = await supabase.from('wallets').select('*').maybeSingle();
  if (error) throw error;
  return data as Wallet | null;
}

export async function fetchWalletTransactions(): Promise<WalletTransaction[]> {
  const { data: wallet } = await supabase.from('wallets').select('id').maybeSingle();
  if (!wallet) return [];
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('wallet_id', (wallet as { id: string }).id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WalletTransaction[];
}

/* ---------------- Notifications (owner-scoped) ---------------- */

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
  if (error) throw error;
}

/* ---------------- Payments (Razorpay edge functions) ---------------- */

export async function createRazorpayOrder(orderId: string, amount: number): Promise<RazorpayCreateOrderResponse> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/razorpay-create-order`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({ order_id: orderId, amount, currency: 'INR' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Failed to create Razorpay order (${res.status})`);
  }
  const data = await res.json();
  return data as RazorpayCreateOrderResponse;
}

export async function verifyRazorpayPayment(params: {
  order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<RazorpayVerifyResponse> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/razorpay-verify-payment`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Payment verification failed (${res.status})`);
  }
  const data = await res.json();
  return data as RazorpayVerifyResponse;
}

export async function markOrderPaid(orderId: string, paymentMethod: PaymentMethod): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'paid' })
    .eq('id', orderId);
  if (error) throw error;
}

export async function fetchPaymentsForOrder(orderId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

/* ---------------- App Settings (hardcoded defaults) ---------------- */

export const APP_SETTINGS = {
  delivery_fee: 30,
  free_delivery_threshold: 250,
  tax_rate: 5,
  default_currency: 'INR',
  restaurant_name: 'Mezbaan',
  restaurant_tagline: 'Freshly Crafted, Honestly Served',
  restaurant_phone: '',
  restaurant_address: '',
  min_order_value: 0,
  support_email: '',
};
