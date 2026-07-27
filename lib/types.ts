export type Category = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  sort_order: number;
  is_active: boolean;
};

export type ProductAddon = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  is_active: boolean;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  price: number;
  is_veg: boolean;
  is_available: boolean;
  is_bestseller: boolean;
  is_popular: boolean;
  is_new: boolean;
  is_combo: boolean;
  rating: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  product_variants?: ProductVariant[];
  product_addons?: ProductAddon[];
};

export type Offer = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_route: string | null;
  sort_order: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
};

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  min_order: number;
  max_discount: number;
  first_order_only: boolean;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
};

export type DeliveryZone = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_km: number;
  is_active: boolean;
};

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type AddressLabel = 'home' | 'work' | 'other';

export type Address = {
  id: string;
  user_id: string;
  label: AddressLabel;
  full_address: string;
  landmark: string | null;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  created_at: string;
};

export type Favorite = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
};

export type OrderStatus = 'received' | 'preparing' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod' | 'upi' | 'razorpay' | 'wallet';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type CartLineSnapshot = {
  product_id: string;
  name: string;
  image_url: string | null;
  base_price: number;
  unit_price: number;
  quantity: number;
  variant_id?: string | null;
  variant_name?: string | null;
  addon_ids: string[];
  addon_names: string[];
  addons_total: number;
  line_total: number;
};

export type RazorpayStatus = 'pending' | 'created' | 'paid' | 'failed';

export type Order = {
  id: string;
  user_id: string;
  order_no: string;
  status: OrderStatus;
  items: CartLineSnapshot[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total: number;
  coupon_code: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  delivery_address: Address;
  notes: string | null;
  zone_id: string | null;
  zone_name: string | null;
  distance_km: number | null;
  status_history: { status: OrderStatus; at: string }[];
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  razorpay_status: RazorpayStatus;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  image_url: string | null;
  price: number;
  quantity: number;
  variant_name: string | null;
  addons: { name: string; price: number }[];
};

export type Wallet = {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

export type WalletTransaction = {
  id: string;
  wallet_id: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string | null;
  reference_id: string | null;
  created_at: string;
};

export type NotificationType = 'order' | 'promo' | 'wallet' | 'system';

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export type Payment = {
  id: string;
  order_id: string;
  user_id: string;
  provider: PaymentMethod;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  provider_signature: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus | 'created';
  error_code: string | null;
  error_description: string | null;
  raw_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type RazorpayCreateOrderResponse = {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  key_id: string;
};

export type RazorpayVerifyResponse = {
  verified: boolean;
  order_id: string;
  payment_status: PaymentStatus;
  razorpay_payment_id: string;
  razorpay_order_id: string;
};

export type AppSettings = {
  delivery_fee: number;
  free_delivery_threshold: number;
  tax_rate: number;
  default_currency: string;
  razorpay_upi_id: string;
  restaurant_name: string;
  restaurant_tagline: string;
  restaurant_phone: string;
  restaurant_address: string;
  min_order_value: number;
  support_email: string;
};
