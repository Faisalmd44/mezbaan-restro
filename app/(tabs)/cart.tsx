import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Trash2, Tag, X, ShoppingBag, ChevronRight } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/lib/theme';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { CachedImage } from '@/components/CachedImage';
import { QuantityStepper } from '@/components/QuantityStepper';
import { EmptyState } from '@/components/EmptyState';
import { PriceRow } from '@/components/PriceRow';
import { useCart } from '@/lib/cart-context';
import { fetchCoupons, validateCoupon, fetchOrders } from '@/lib/services';
import { useAuth } from '@/lib/auth-context';
import type { Coupon } from '@/lib/types';
import { formatCurrency, haptic } from '@/lib/utils';

export default function CartScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { user } = useAuth();
  const { items, count, subtotal, discount, deliveryFee, tax, total, coupon, applyCoupon, removeCoupon, updateQty, removeItem, clear, freeDeliveryThreshold } = useCart();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCoupons, setShowCoupons] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadCoupons = useCallback(async () => {
    try { const c = await fetchCoupons(); setCoupons(c); } catch (e) { console.warn('coupons load', e); }
  }, []);

  const onRefresh = () => { setRefreshing(true); loadCoupons().finally(() => setRefreshing(false)); };

  const isFirstOrder = async (): Promise<boolean> => {
    try { const orders = await fetchOrders(); return orders.length === 0; } catch { return false; }
  };

  const handleApplyCoupon = async () => {
    if (couponInput.trim().toUpperCase())) return;
    setValidating(true); setCouponError(null);
    try {
      const first = await isFirstOrder();
      const { coupon: c, error } = await validateCoupon(couponInput.trim().toUpperCase(), subtotal, first);

      if (error || !c) { setCouponError(error ?? 'Invalid coupon'); haptic.error(); }
      else { applyCoupon(c); setCouponInput(''); haptic.success(); }
    } catch { setCouponError('Could not validate coupon.'); }
    finally { setValidating(false); }
  };

  const handleSelectCoupon = async (c: Coupon) => {
    setCouponError(null);
    const first = await isFirstOrder();
    const { error } = await validateCoupon(c.code, subtotal, first);
    if (error) { setCouponError(error); haptic.error(); }
    else { applyCoupon(c); setShowCoupons(false); haptic.success(); }
  };

  const remainingForFree = Math.max(0, freeDeliveryThreshold - (subtotal - discount));
  const freeDeliveryProgress = Math.min(100, ((subtotal - discount) / freeDeliveryThreshold) * 100);
  const goToCheckout = () => { if (!user) { router.push('/(auth)/login'); return; } router.push('/checkout'); };

  if (count === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.header}><Text variant="h2" weight="bold">Your Cart</Text></View>
        <EmptyState icon={<ShoppingBag size={32} color={COLORS.gold} />} title="Your cart is empty" subtitle="Browse our menu and add your favourite dishes." actionLabel="Browse Menu" onAction={() => router.push('/(tabs)/menu')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View><Text variant="h2" weight="bold">Your Cart</Text><Text variant="caption" color="secondary">{count} item{count > 1 ? 's' : ''}</Text></View>
        <Pressable onPress={() => { haptic.light(); clear(); }} style={styles.clearBtn}><Trash2 size={16} color={COLORS.error} /><Text variant="caption" color="error">Clear</Text></Pressable>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />} showsVerticalScrollIndicator={false}>
        <View style={styles.deliveryProgress}>
          {remainingForFree > 0 ? (<Text variant="caption" color="secondary">Add <Text variant="caption" color="gold" weight="semiBold">{formatCurrency(remainingForFree)}</Text> more for FREE delivery</Text>) : (<Text variant="caption" color="success" weight="semiBold">You've unlocked FREE delivery!</Text>)}
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${freeDeliveryProgress}%` }]} /></View>
        </View>
        {items.map((item) => {
          const base = Number(item.variant?.price ?? item.product.price);
          const addonsTotal = item.addons.reduce((s, a) => s + Number(a.price), 0);
          const unit = base + addonsTotal;
          return (
            <View key={item.key} style={styles.cartItem}>
              <CachedImage uri={item.product.image_url} style={styles.itemImg} />
              <View style={styles.itemBody}>
                <Text weight="semiBold" numberOfLines={1} style={styles.itemName}>{item.product.name}</Text>
                {item.variant && <Text variant="caption" color="secondary">{item.variant.name}</Text>}
                {item.addons.length > 0 && <Text variant="caption" color="tertiary" numberOfLines={1}>+ {item.addons.map((a) => a.name).join(', ')}</Text>}
                <View style={styles.itemFooter}>
                  <QuantityStepper value={item.quantity} onDecrement={() => updateQty(item.key, item.quantity - 1)} onIncrement={() => updateQty(item.key, item.quantity + 1)} size="sm" />
                  <Text weight="bold" color="gold">{formatCurrency(unit * item.quantity)}</Text>
                </View>
              </View>
              <Pressable onPress={() => { haptic.light(); removeItem(item.key); }} style={styles.removeItem}><X size={16} color={COLORS.onSurfaceTertiary} /></Pressable>
            </View>
          );
        })}
        <View style={styles.couponSection}>
          <Pressable onPress={() => { setShowCoupons((v) => !v); if (!showCoupons) loadCoupons(); }} style={styles.couponHeader}>
            <View style={styles.couponHeaderLeft}><Tag size={18} color={COLORS.gold} /><Text weight="semiBold">{coupon ? `Coupon: ${coupon.code}` : 'Apply Coupon'}</Text></View>
            <ChevronRight size={16} color={COLORS.onSurfaceSecondary} style={{ transform: [{ rotate: showCoupons ? '90deg' : '0deg' }] }} />
          </Pressable>
          {coupon && (
            <View style={styles.appliedCoupon}>
              <View style={styles.appliedLeft}><View style={styles.couponTag}><Text variant="caption" color="gold" weight="bold">{coupon.code}</Text></View><Text variant="caption" color="secondary">{coupon.description}</Text></View>
              <Pressable onPress={() => { removeCoupon(); haptic.light(); }}><X size={16} color={COLORS.onSurfaceTertiary} /></Pressable>
            </View>
          )}
          {showCoupons && !coupon && (
            <View style={styles.couponList}>
              <View style={styles.couponInputRow}>
                <TextInput value={couponInput} onChangeText={setCouponInput} placeholder="Enter coupon code" placeholderTextColor={COLORS.onSurfaceTertiary} autoCapitalize="characters" style={styles.couponInput} />
                <Button label={validating ? '...' : 'Apply'} onPress={handleApplyCoupon} disabled={validating} />
              </View>
              {couponError && <Text variant="caption" color="error" style={styles.couponError}>{couponError}</Text>}
              {coupons.map((c) => (
                <Pressable key={c.id} onPress={() => handleSelectCoupon(c)} style={({ pressed }) => [styles.couponCard, pressed && { opacity: 0.85 }]}>
                  <View style={styles.couponCardLeft}><View style={styles.couponTag}><Text variant="caption" color="gold" weight="bold">{c.code}</Text></View><Text variant="caption" color="secondary" style={styles.couponDesc}>{c.description}</Text><Text variant="caption" color="tertiary">Min order {formatCurrency(Number(c.min_order))}{c.first_order_only ? ' - First order only' : ''}</Text></View>
                  <ChevronRight size={16} color={COLORS.gold} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <View style={styles.notesSection}>
          <Text variant="h3" weight="semiBold" style={styles.notesTitle}>Delivery Instructions</Text>
          <TextInput placeholder="Any special instructions? (e.g. ring the bell, no contact delivery)" placeholderTextColor={COLORS.onSurfaceTertiary} multiline style={styles.notesInput} />
        </View>
        <View style={styles.billSection}>
          <Text variant="h3" weight="semiBold" style={styles.billTitle}>Bill Details</Text>
          <PriceRow label="Item Total" value={formatCurrency(subtotal)} />
          {discount > 0 && <PriceRow label="Coupon Discount" value={`- ${formatCurrency(discount)}`} color={COLORS.success} />}
          <PriceRow label="Delivery Fee" value={deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)} />
          <PriceRow label="Taxes & Charges" value={formatCurrency(tax)} />
          <View style={styles.divider} />
          <PriceRow label="To Pay" value={formatCurrency(total)} bold color={COLORS.gold} />
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
      <View
  style={[
    styles.ctaBar,
    {
      paddingBottom: tabBarHeight + SPACING.md,
    },
  ]}
>
        <View><Text variant="caption" color="secondary">{count} item{count > 1 ? 's' : ''}</Text><Text variant="h3" weight="bold" color="gold">{formatCurrency(total)}</Text></View>
        <Button label="Checkout" onPress={goToCheckout} size="lg" style={styles.ctaBtn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: SPACING.xs },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING['4xl'] },
  deliveryProgress: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, gap: SPACING.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: COLORS.surfaceTertiary, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: COLORS.gold },
  cartItem: { flexDirection: 'row', gap: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  itemImg: { width: 76, height: 76, borderRadius: RADIUS.md },
  itemBody: { flex: 1, gap: 2 },
  itemName: { fontSize: 15 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm },
  removeItem: { padding: SPACING.xs, alignSelf: 'flex-start' },
  couponSection: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, marginBottom: SPACING.md, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, overflow: 'hidden' },
  couponHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md },
  couponHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  appliedCoupon: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  appliedLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  couponTag: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.goldBorder, backgroundColor: COLORS.goldMuted },
  couponList: { padding: SPACING.md, gap: SPACING.sm },
  couponInputRow: { flexDirection: 'row', gap: SPACING.sm },
  couponInput: { flex: 1, backgroundColor: COLORS.surfaceTertiary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, color: COLORS.onSurface, fontFamily: TYPOGRAPHY.fontFamilyRegular, fontSize: TYPOGRAPHY.base, paddingVertical: SPACING.sm },
  couponError: { marginTop: 2 },
  couponCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider },
  couponCardLeft: { flex: 1, gap: 2 },
  couponDesc: { lineHeight: 18 },
  notesSection: { marginBottom: SPACING.lg },
  notesTitle: { marginBottom: SPACING.sm },
  notesInput: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, color: COLORS.onSurface, fontFamily: TYPOGRAPHY.fontFamilyRegular, fontSize: TYPOGRAPHY.base, minHeight: 70, textAlignVertical: 'top', borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  billSection: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  billTitle: { marginBottom: SPACING.sm },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.sm },
  ctaBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: COLORS.glass, borderTopColor: COLORS.goldBorder, borderTopWidth: 1 },
  ctaBtn: { flex: 1, marginLeft: SPACING.lg },
});
