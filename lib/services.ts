import { supabase } from './supabase';
import type {
  Category,
  Product,
  Offer,
  Coupon,
  DeliveryZone,
  Address,
  AddressLabel,
  Favorite,
  Order,
  OrderStatus,
  PaymentMethod,
  CartLineSnapshot,
  Wallet,
  WalletTransaction,
  AppNotification,
  AppSettings,
  Payment,
  RazorpayCreateOrderResponse,
  RazorpayVerifyResponse,
} from './types';

/* ---------------- Catalog (public, readable by anon) ---------------- */

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("category,image");
console.log("MENU ITEMS =>", data);
  if (error) throw error;

  const map = new Map<string, Category>();

  (data ?? []).forEach((row: any) => {
    if (!map.has(row.category)) {
      map.set(row.category, {
        id: row.category,
        name: row.category,
        slug: row.category.toLowerCase().replace(/\s+/g, "-"),
        image_url: row.image ?? null,
        sort_order: 0,
        active: true,
        created_at: "",
      });
    }
  });

  return [...map.values()];
}

export async function fetchProducts(opts?: {
  categoryId?: string;
  search?: string;
  vegOnly?: boolean;
  badge?: 'is_bestseller' | 'is_popular' | 'is_new' | 'is_combo';
  limit?: number;
}): Promise<Product[]> {
  let q = supabase
    .from('menu_items')
    .select('*')
    .eq('in_stock', true)
    .order('created_at', { ascending: false });

  if (opts?.categoryId) q = q.eq('category', opts.categoryId);
  if (opts?.vegOnly) q = q.eq('is_veg', true);
  if (opts?.badge === 'is_bestseller') {
  q = q.eq('is_bestseller', true);
}
  if (opts?.search) q = q.ilike('name', `%${opts.search}%`);
  if (opts?.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
console.log("MENU_ITEMS =", JSON.stringify(data));
console.log("MENU_ERROR =", error);
  if (error) throw error;

  return (data ?? []).map((item: any) => ({
    ...item,
    image_url: item.image,
    is_available: item.in_stock,
    category_id: item.category,
    slug: null,
    sort_order: 0,
    updated_at: item.created_at,
    product_variants: [],
    product_addons: [],
    is_popular: false,
    is_new: false,
    is_combo: false,
  })) as Product[];
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    image_url: data.image,
    is_available: data.in_stock,
    category_id: data.category,
    slug: null,
    sort_order: 0,
    updated_at: data.created_at,
    product_variants: [],
    product_addons: [],
    is_popular: false,
    is_new: false,
    is_combo: false,
  } as Product;
}

export async function fetchSimilarProducts(productId: string, categoryId: string, limit = 6): Promise<Product[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('category', categoryId)
    .eq('in_stock', true)
    .neq('id', productId)
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((item: any) => ({
  ...item,
  image_url: item.image,
  is_available: item.in_stock,
  category_id: item.category,
  slug: null,
  sort_order: 0,
  updated_at: item.created_at,
  product_variants: [],
  product_addons: [],
  is_popular: false,
  is_new: false,
  is_combo: false,
}));
}

export async function fetchOffers(): Promise<Offer[]> {
  return [];
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

export async function validateCoupon(code: string, subtotal: number, isFirstOrder: boolean): Promise<{ coupon: Coupon | null; error: string | null }> {
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
  if (c.first_order_only && !isFirstOrder) {
    return { coupon: null, error: 'This coupon is valid only on your first order' };
  }
  return { coupon: c, error: null };
}

export async function fetchDeliveryZones(): Promise<DeliveryZone[]> {
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('active', true);
  if (error) throw error;
  return (data ?? []) as DeliveryZone[];
}

export async function fetchAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('app_settings').select('*');
  if (error) throw error;
  const map: Record<string, string> = {};
  (data ?? []).forEach((row: { key: string; value: string }) => {
    const v = row.value;
    map[row.key] = typeof v === 'string' ? v.replace(/^"|"$/g, '') : String(v);
  });
  return {
    delivery_fee: Number(map.delivery_fee ?? 30),
    free_delivery_threshold: Number(map.free_delivery_threshold ?? 250),
    tax_rate: Number(map.tax_rate ?? 5),
    default_currency: map.default_currency ?? 'INR',
    razorpay_upi_id: map.razorpay_upi_id ?? '',
    restaurant_name: map.restaurant_name ?? 'Mezbaan Restro',
    restaurant_tagline: map.restaurant_tagline ?? 'Freshly Crafted, Honestly Served',
    restaurant_phone: map.restaurant_phone ?? '',
    restaurant_address: map.restaurant_address ?? '',
    min_order_value: Number(map.min_order_value ?? 0),
    support_email: map.support_email ?? '',
  };
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
  label: AddressLabel;
  full_address: string;
  landmark?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
}): Promise<Address> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please login again.");
  }

  const { data, error } = await supabase
    .from("addresses")
    .insert({
      ...input,
      user_id: user.id,
    })
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
    .select('*, product:menu_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Favorite[];
}

export async function fetchFavoriteProductIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('favorites').select('product_id');
  if (error) throw error;
  return new Set((data ?? []).map((r: { product_id: string }) => r.product_id));
}

export async function toggleFavorite(productId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('product_id', productId)
    .maybeSingle();
  if (existing) {
    await supabase.from('favorites').delete().eq('id', (existing as { id: string }).id);
    return false;
  }
  const { error } = await supabase.from('favorites').insert({ product_id: productId });
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
  delivery_address: Address;
  notes?: string;
  zone_id?: string | null;
  zone_name?: string | null;
  distance_km?: number | null;
}): Promise<Order> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: userData } = await supabase
    .from("users")
    .select("name, phone")
    .eq("id", user?.id)
    .single();

  const orderNo = `MZB${Date.now().toString().slice(-10)}`;

  const payload = {
    order_no: orderNo,
    user_id: user?.id ?? null,
    user_name: userData?.name ?? "",
    user_phone: userData?.phone ?? "",
    address: input.delivery_address.full_address,
    total: input.total,
    status: "received",
    payment_method: input.payment_method,
    payment_status: "pending",
    notes: input.notes ?? null,
    coupon_code: input.coupon_code,
    status_history: [
      {
        status: "received",
        at: new Date().toISOString(),
      },
    ],
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(payload)
    .select()
    .single();

  console.log("ORDER ERROR =", error);
  console.log("ORDER DATA =", data);

  if (error) throw error;

  const order = data as Order;

  if (input.items.length) {
   
  const rows = input.items.map((i) => ({
  order_id: order.id,
  item_id: i.product_id,
  name: i.name,
  price: i.unit_price,
  quantity: i.quantity,
  variant: i.variant_name ?? null,
}));

    const { error: itemError } =
  await supabase.from("order_items").insert(rows);

console.log("ORDER_ITEMS ERROR =", itemError);

if (itemError) throw itemError;
  }

  await supabase.from("notifications").insert({
    type: "order",
    title: "Order Placed",
    body: `Your order ${orderNo} has been received.`,
    data: {
      order_id: order.id,
      order_no: orderNo,
    },
  });

  return order;
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function fetchOrderById(id: string): Promise<Order | null> {
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  return {
    ...(order as any),

    items: (items ?? []).map((i: any) => ({
      product_id: i.item_id,
      name: i.name,
      image_url: null,
      base_price: Number(i.price),
      unit_price: Number(i.price),
      quantity: i.quantity,
      variant_id: null,
      variant_name: i.variant,
      addon_ids: [],
      addon_names: [],
      addons_total: 0,
      line_total: Number(i.price) * Number(i.quantity),
    })),
    subtotal: Number((order as any).total),
    discount: 0,
    delivery_fee: 0,
    tax: 0,

    delivery_address: {
      id: "",
      user_id: (order as any).user_id ?? "",
      label: "home",
      full_address: (order as any).address ?? "",
      landmark: null,
      lat: null,
      lng: null,
      is_default: false,
      created_at: "",
    },

    notes: (order as any).notes,
    zone_id: null,
    zone_name: null,
    distance_km: null,

    created_at: (order as any).created_at,
    updated_at: (order as any).created_at,
  } as Order;
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

export async function fetchWallet(): Promise<any> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
  .from('users')
  .select('wallet')
  .eq('id', user.id)
  .maybeSingle();
if (error) throw error;

if (!data) {
  return { balance: 0 };
}
  return {
  balance: data.wallet,
};
}

export async function fetchWalletTransactions() {
  return [];
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

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mezbaan-api/payments/razorpay/create-order`;
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

 const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/mezbaan-api/payments/razorpay/verify`;
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
