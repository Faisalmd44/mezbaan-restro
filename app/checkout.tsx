import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, MapPin, CreditCard, Wallet as WalletIcon, Banknote, Smartphone, Plus, CheckCircle2 } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/lib/theme';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { PriceRow } from '@/components/PriceRow';
import { RazorpayCheckout, RazorpayCheckoutParams, RazorpayResult } from '@/components/RazorpayCheckout';
import { useCart, toSnapshots, getDeviceId } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import {
  fetchAddresses, placeOrder, fetchDeliveryZones, fetchWallet, createRazorpayOrder, verifyRazorpayPayment, markOrderPaid,
} from '@/lib/services';
import type { Address, PaymentMethod, DeliveryZone, Wallet } from '@/lib/types';
import { formatCurrency, haptic, haversineKm } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const {
    items, count, subtotal, discount, deliveryFee, tax, total,
    couponCode, selectedAddress, setSelectedAddress, paymentMethod, setPaymentMethod, orderNotes, clear,
  } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpayVisible, setRazorpayVisible] = useState(false);
  const [razorpayParams, setRazorpayParams] = useState<RazorpayCheckoutParams | null>(null);
  const pendingOrderRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [addr, z, w] = await Promise.all([
        fetchAddresses().catch(() => [] as Address[]),
        fetchDeliveryZones().catch(() => [] as DeliveryZone[]),
        fetchWallet().catch(() => null),
      ]);
      setAddresses(addr);
      setZones(z);
      setWallet(w);
      const def = addr.find((a) => a.is_default) ?? addr[0];
      if (def && !selectedAddress) setSelectedAddress(def);
    } catch (e) {
      console.warn('checkout load', e);
    } finally {
      setLoading(false);
    }
  }, [selectedAddress, setSelectedAddress]);

  useEffect(() => { load(); }, [load]);

  const checkDelivery = (addr: Address): { ok: boolean; distance: number; zone: DeliveryZone | null } => {
    if (!addr.lat || !addr.lng || zones.length === 0) return { ok: true, distance: 0, zone: zones[0] ?? null };
    let best: { zone: DeliveryZone; distance: number } | null = null;
    for (const z of zones) {
      const d = haversineKm(addr.lat, addr.lng, z.lat, z.lng);
      if (!best || d < best.distance) best = { zone: z, distance: d };
    }
    if (!best) return { ok: false, distance: 0, zone: null };
    return { ok: best.distance <= best.zone.radius_km, distance: best.distance, zone: best.zone };
  };

  const handlePlaceOrder = async () => {
    setError(null);
    if (!selectedAddress) {
      setError('Please select a delivery address.');
      return;
    }
    const check = checkDelivery(selectedAddress);
    if (!check.ok) {
      setError('Sorry, we do not deliver to this address yet.');
      return;
    }
    if (paymentMethod === 'wallet' && wallet && Number(wallet.balance) < total) {
      setError('Insufficient wallet balance. Choose another payment method.');
      return;
    }

    setPlacing(true);
    try {
      // Get physical device ID to enforce per-device coupon rules
      const deviceId = await getDeviceId();

      // Step 1: Create the order in Supabase (payment_status = 'pending')
      const order = await placeOrder({
        items: toSnapshots(items),
        subtotal,
        discount,
        delivery_fee: deliveryFee,
        tax,
        total,
        coupon_code: couponCode,
        device_id: deviceId, // 👈 Per-Device Hardware Lock Parameter
        payment_method: paymentMethod,
        delivery_address: selectedAddress,
        notes: orderNotes,
        zone_id: check.zone?.id ?? null,
        zone_name: check.zone?.name ?? null,
        distance_km: check.distance || null,
      });

      if (paymentMethod === 'cod') {
        haptic.success();
        clear();
        router.replace(`/tracking/${order.id}`);
        return;
      }

      if (paymentMethod === 'wallet') {
        const { error: walletError } = await supabase.rpc('deduct_wallet', {
          p_amount: total,
          p_reference: order.id,
          p_description: `Payment for order ${order.order_no}`,
        });
        if (walletError) {
          setError('Wallet payment failed: ' + walletError.message);
          haptic.error();
          return;
        }
        await markOrderPaid(order.id, 'wallet');
        haptic.success();
        clear();
        router.replace(`/tracking/${order.id}`);
        return;
      }

      if (paymentMethod === 'upi') {
        const upiId = 'mohd.4548@ptaxis';
        const upiUrl = `upi://pay?pa=${upiId}&pn=Mezbaan%20Restro&am=${total.toFixed(2)}&cu=INR&tn=Order%20${order.order_no}`;
        const canOpen = await Linking.canOpenURL(upiUrl);
        if (!canOpen && Platform.OS !== 'web') {
          setError('No UPI app found. Please install a UPI app or choose another payment method.');
          haptic.error();
          return;
        }
        if (Platform.OS === 'web') {
          Alert.alert(
            'UPI Payment',
            `Pay ${formatCurrency(total)} to UPI ID: ${upiId}\n\nOrder ID: ${order.order_no}\n\nAfter payment, your order will be confirmed manually.`,
            [{ text: 'OK', onPress: () => {
              clear();
              router.replace(`/tracking/${order.id}`);
            }}]
          );
          return;
        }
        await Linking.openURL(upiUrl);
        haptic.success();
        clear();
        router.replace(`/tracking/${order.id}`);
        return;
      }

      if (paymentMethod === 'razorpay') {
        const razorpayOrder = await createRazorpayOrder(order.id, total);
        pendingOrderRef.current = order.id;
        setRazorpayParams({
          key_id: razorpayOrder.key_id,
          razorpay_order_id: razorpayOrder.razorpay_order_id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: 'Mezbaan Restro',
          description: `Order ${order.order_no}`,
          prefill: {
            name: profile?.full_name ?? '',
            email: user?.email ?? '',
            contact: profile?.phone ?? '',
          },
        });
        setRazorpayVisible(true);
        return;
      }
    } catch (e) {
      setError('Failed to place order. Please try again.');
      haptic.error();
      console.warn('place order', e);
    } finally {
      setPlacing(false);
    }
  };

  const handleRazorpaySuccess = async (result: RazorpayResult) => {
    setRazorpayVisible(false);
    const orderId = pendingOrderRef.current;
    if (!orderId) return;
    setPlacing(true);
    try {
      await verifyRazorpayPayment({
        order_id: orderId,
        razorpay_order_id: result.razorpay_order_id,
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      });
      haptic.success();
      clear();
      router.replace(`/tracking/${orderId}`);
    } catch (e) {
      setError('Payment verification failed. If money was deducted, it will be refunded automatically.');
      haptic.error();
      console.warn('razorpay verify', e);
    } finally {
      pendingOrderRef.current = null;
      setRazorpayParams(null);
      setPlacing(false);
    }
  };

  const handleRazorpayError = (errMsg: string) => {
    setRazorpayVisible(false);
    setError(errMsg);
    haptic.error();
    setRazorpayParams(null);
    pendingOrderRef.current = null;
  };

  const handleRazorpayClose = () => {
    setRazorpayVisible(false);
    setRazorpayParams(null);
    pendingOrderRef.current = null;
  };

  const paymentMethods: { method: PaymentMethod; label: string; icon: React.ReactNode; subtitle: string }[] = [
    { method: 'cod', label: 'Cash on Delivery', icon: <Banknote size={20} color={COLORS.gold} />, subtitle: 'Pay when you receive' },
    { method: 'upi', label: 'UPI', icon: <Smartphone size={20} color={COLORS.gold} />, subtitle: 'mohd.4548@ptaxis' },
    { method: 'razorpay', label: 'Razorpay', icon: <CreditCard size={20} color={COLORS.gold} />, subtitle: 'Cards, NetBanking, Wallets' },
    { method: 'wallet', label: 'Mezbaan Wallet', icon: <WalletIcon size={20} color={COLORS.gold} />, subtitle: wallet ? `Balance: ${formatCurrency(Number(wallet.balance))}` : 'No wallet' },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.onSurface} />
        </Pressable>
        <Text variant="h2" weight="bold">Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.errorBox}>
            <Text variant="caption" color="error">{error}</Text>
          </View>
        )}

        {/* Address */}
        <View style={styles.section}>
          <Text variant="h3" weight="semiBold" style={styles.sectionTitle}>Delivery Address</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.gold} />
          ) : addresses.length === 0 ? (
            <Pressable onPress={() => router.push('/address-add')} style={styles.addAddrCard}>
              <Plus size={20} color={COLORS.gold} />
              <Text color="gold" weight="semiBold">Add an address</Text>
            </Pressable>
          ) : (
            <>
              {addresses.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => { haptic.selection(); setSelectedAddress(a); }}
                  style={({ pressed }) => [styles.addrCard, selectedAddress?.id === a.id && styles.addrActive, pressed && { opacity: 0.9 }]}
                >
                  <View style={styles.addrIcon}>
                    <MapPin size={18} color={COLORS.gold} />
                  </View>
                  <View style={styles.addrBody}>
                    <View style={styles.addrLabelRow}>
                      <Text variant="caption" color="gold" weight="semiBold" style={styles.addrLabelTag}>{a.label.toUpperCase()}</Text>
                      {a.is_default && <Text variant="caption" color="tertiary">· Default</Text>}
                    </View>
                    <Text weight="medium" numberOfLines={2}>{a.full_address}</Text>
                    {a.landmark && <Text variant="caption" color="secondary">Near {a.landmark}</Text>}
                  </View>
                  {selectedAddress?.id === a.id && <CheckCircle2 size={20} color={COLORS.gold} />}
                </Pressable>
              ))}
              <Pressable onPress={() => router.push('/address-add')} style={styles.addAddrRow}>
                <Plus size={16} color={COLORS.gold} />
                <Text variant="caption" color="gold" weight="semiBold">Add new address</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/address-list')} style={styles.manageAddrRow}>
                <Text variant="caption" color="secondary">Manage addresses</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Payment method */}
        <View style={styles.section}>
          <Text variant="h3" weight="semiBold" style={styles.sectionTitle}>Payment Method</Text>
          {paymentMethods.map((pm) => (
            <Pressable
              key={pm.method}
              onPress={() => { haptic.selection(); setPaymentMethod(pm.method); }}
              style={({ pressed }) => [styles.payCard, paymentMethod === pm.method && styles.payActive, pressed && { opacity: 0.9 }]}
            >
              {pm.icon}
              <View style={styles.payBody}>
                <Text weight="semiBold">{pm.label}</Text>
                <Text variant="caption" color="secondary">{pm.subtitle}</Text>
              </View>
              <View style={[styles.radio, paymentMethod === pm.method && styles.radioActive]}>
                {paymentMethod === pm.method && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Order summary */}
        <View style={styles.section}>
          <Text variant="h3" weight="semiBold" style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            {items.map((i) => {
              const base = Number(i.variant?.price ?? i.product.price);
              const addonsTotal = i.addons.reduce((s, a) => s + Number(a.price), 0);
              return (
                <View key={i.key} style={styles.summaryItem}>
                  <Text variant="caption" color="gold" weight="semiBold">{i.quantity}×</Text>
                  <Text variant="caption" numberOfLines={1} style={styles.summaryName}>{i.product.name}{i.variant ? ` (${i.variant.name})` : ''}</Text>
                  <Text variant="caption" color="secondary">{formatCurrency((base + addonsTotal) * i.quantity)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Bill */}
        <View style={styles.section}>
          <View style={styles.billCard}>
            <PriceRow label="Item Total" value={formatCurrency(subtotal)} />
            {discount > 0 && <PriceRow label="Discount" value={`- ${formatCurrency(discount)}`} color={COLORS.success} />}
            <PriceRow label="Delivery Fee" value={deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)} />
            <PriceRow label="Taxes" value={formatCurrency(tax)} />
            <View style={styles.divider} />
            <PriceRow label="To Pay" value={formatCurrency(total)} bold color={COLORS.gold} />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.ctaBar}>
        <View>
          <Text variant="caption" color="secondary">Total</Text>
          <Text variant="h3" weight="bold" color="gold">{formatCurrency(total)}</Text>
        </View>
        <Button
          label={placing ? 'Placing Order…' : 'Place Order'}
          onPress={handlePlaceOrder}
          loading={placing}
          disabled={count === 0}
          size="lg"
          style={styles.ctaBtn}
        />
      </View>

      <RazorpayCheckout
        visible={razorpayVisible}
        params={razorpayParams}
        onSuccess={handleRazorpaySuccess}
        onError={handleRazorpayError}
        onClose={handleRazorpayClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING['4xl'] },
  errorBox: {
    backgroundColor: 'rgba(229,72,77,0.12)',
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { marginBottom: SPACING.md },
  addAddrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.goldBorder,
    borderStyle: 'dashed',
  },
  addrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  addrActive: { borderColor: COLORS.gold },
  addrIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.goldMuted, alignItems: 'center', justifyContent: 'center' },
  addrBody: { flex: 1, gap: 2 },
  addrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addrLabelTag: { letterSpacing: 0.5 },
  addAddrRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: SPACING.sm, alignSelf: 'flex-start' },
  manageAddrRow: { paddingVertical: 2 },
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  payActive: { borderColor: COLORS.gold },
  payBody: { flex: 1, gap: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: COLORS.gold },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.gold },
  summaryCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  summaryItem: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  summaryName: { flex: 1 },
  billCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.sm },
  ctaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.glass,
    borderTopColor: COLORS.goldBorder,
    borderTopWidth: 1,
    ...SHADOWS.floating,
  },
  ctaBtn: { flex: 1, marginLeft: SPACING.lg },
});

