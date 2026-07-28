export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image: string | null;
  in_stock: boolean;
  is_veg: boolean;
  is_bestseller: boolean;
  rating: number;
  prep_time: number;
  created_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  uses: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  picture: string | null;
  wallet: number;
  referral_code: string;
  is_admin: boolean;
  google_id: string | null;
  device_id: string | null;
  created_at: string;
};

export type AddressLabel = 'Home' | 'Work' | 'Other';

export type Address = {
  id: string;
  user_id: string;
  label: string;
  line: string;
  is_default: boolean;
  created_at: string;
};

export type Favorite = {
  id: string;
  user_id: string;
  item_id: string;
  created_at: string;
  menu_item?: MenuItem;
};

export type OrderStatus = 'received' | 'preparing' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod' | 'upi' | 'razorpay' | 'wallet';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type RazorpayStatus = 'pending' | 'created' | 'paid' | 'failed';

export type CartLineSnapshot = {
  item_id: string;
  name: string;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Order = {
  id: string;
  order_no: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  address: string;
  total: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  razorpay_status: RazorpayStatus;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  coupon_code: string | null;
  notes: string | null;
  status_history: { status: OrderStatus; at: string }[];
  created_at: string;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  item_id: string | null;
  name: string;
  image_url: string | null;
  price: number;
  quantity: number;
  variant_name: string | null;
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
  restaurant_name: string;
  restaurant_tagline: string;
  restaurant_phone: string;
  restaurant_address: string;
  min_order_value: number;
  support_email: string;
};
