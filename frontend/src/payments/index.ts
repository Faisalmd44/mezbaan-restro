/**
 * Modular payment method registry.
 *
 * To add a new gateway later (Razorpay, Paytm, Stripe etc.), create a new file
 * that exports a `PaymentMethod` and register it in `AVAILABLE_METHODS` below.
 * No other UI code needs to change — `checkout.tsx` renders whatever is enabled.
 */

export type PaymentContext = {
  amount: number;      // final amount in INR
  orderId?: string;
  customerName: string;
  customerPhone: string;
};

export type PaymentResult = {
  success: boolean;
  transaction_id?: string;
  method: string;
  message?: string;
};

export type PaymentMethod = {
  id: string;                // sent to backend as `payment_method`
  label: string;             // shown to user
  description: string;
  icon: string;              // Ionicons name
  enabled: boolean;
  /** Execute payment. For COD this is a no-op that resolves immediately. */
  pay(ctx: PaymentContext): Promise<PaymentResult>;
};

const cod: PaymentMethod = {
  id: "cod",
  label: "Cash on Delivery",
  description: "Pay in cash when your order arrives",
  icon: "cash",
  enabled: true,
  async pay() {
    return { success: true, method: "cod", message: "COD selected" };
  },
};

// Placeholder — flip `enabled: true` and swap `pay()` when Razorpay is wired.
const razorpay: PaymentMethod = {
  id: "razorpay",
  label: "Pay Online (UPI / Cards / Netbanking)",
  description: "Coming soon",
  icon: "card",
  enabled: false,
  async pay() {
    return { success: false, method: "razorpay", message: "Not enabled yet" };
  },
};

// Placeholder — enable when you want to show a static UPI QR fallback.
const upiQr: PaymentMethod = {
  id: "upi_qr",
  label: "UPI QR Code",
  description: "Scan & pay to mezbaan@upi",
  icon: "qr-code",
  enabled: false,
  async pay() {
    return { success: true, method: "upi_qr", message: "QR shown" };
  },
};

export const AVAILABLE_METHODS: PaymentMethod[] = [cod, razorpay, upiQr];

export const getEnabledMethods = () => AVAILABLE_METHODS.filter((m) => m.enabled);

export const getMethod = (id: string) =>
  AVAILABLE_METHODS.find((m) => m.id === id) || null;
