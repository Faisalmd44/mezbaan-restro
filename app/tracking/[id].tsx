import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, CheckCircle2, Circle, Truck, ChefHat, Package, Home, XCircle, MapPin } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/lib/theme';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { PriceRow } from '@/components/PriceRow';
import { EmptyState } from '@/components/EmptyState';
import { fetchOrderById, cancelOrder } from '@/lib/services';
import type { Order } from '@/lib/types';
import { formatCurrency, formatDateTime, ORDER_STATUS_LABELS, ORDER_STATUS_FLOW, haptic } from '@/lib/utils';

const stepIcons = [ChefHat, ChefHat, Package, Truck, Home];
const stepLabels = ['Received', 'Preparing', 'Packed', 'Out for Delivery', 'Delivered'];

export default function TrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const o = await fetchOrderById(id);
      setOrder(o);
    } catch (e) {
      console.warn('tracking load', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      await cancelOrder(order.id);
      haptic.success();
      await load();
    } catch (e) {
      console.warn('cancel', e);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color={COLORS.gold} style={styles.center} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.screen}>
        <EmptyState title="Order not found" actionLabel="Back to Orders" onAction={() => router.replace('/(tabs)/orders')} />
      </View>
    );
  }

  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const currentStep = isCancelled ? -1 : ORDER_STATUS_FLOW.indexOf(order.status as typeof ORDER_STATUS_FLOW[number]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.onSurface} />
        </Pressable>
        <View>
          <Text variant="caption" color="tertiary">Order {order.order_no}</Text>
          <Text variant="h3" weight="bold">Tracking</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status banner */}
        <View style={[styles.statusBanner, isCancelled && styles.cancelledBanner]}>
          {isCancelled ? (
            <XCircle size={32} color={COLORS.error} />
          ) : isDelivered ? (
            <CheckCircle2 size={32} color={COLORS.success} />
          ) : (
            <Truck size={32} color={COLORS.gold} />
          )}
          <View style={styles.statusBannerText}>
            <Text variant="h3" weight="bold" color={isCancelled ? 'error' : isDelivered ? 'success' : 'gold'}>
              {ORDER_STATUS_LABELS[order.status]}
            </Text>
            <Text variant="caption" color="secondary">{formatDateTime(order.created_at)}</Text>
          </View>
        </View>

        {/* Stepper */}
        <View style={styles.stepperCard}>
          {!isCancelled ? (
            stepLabels.map((label, idx) => {
              const Icon = stepIcons[idx];
              const done = idx <= currentStep;
              const active = idx === currentStep;
              return (
                <View key={idx} style={styles.stepRow}>
                  <View style={styles.stepIconCol}>
                    <View style={[styles.stepIcon, done && styles.stepDone, active && styles.stepActive]}>
                      <Icon size={16} color={done || active ? COLORS.onGold : COLORS.onSurfaceTertiary} />
                    </View>
                    {idx < stepLabels.length - 1 && (
                      <View style={[styles.stepLine, done && idx < currentStep && styles.stepLineDone]} />
                    )}
                  </View>
                  <View style={styles.stepBody}>
                    <Text weight="semiBold" color={done || active ? 'primary' : 'tertiary'}>{label}</Text>
                    {active && <Text variant="caption" color="gold">In progress…</Text>}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.cancelledBox}>
              <Text color="error" weight="semiBold">This order was cancelled.</Text>
              <Text variant="caption" color="secondary">If you didn't mean to cancel, place a new order.</Text>
            </View>
          )}
        </View>

        {/* Delivery address */}
        <View style={styles.section}>
          <Text variant="h3" weight="semiBold" style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addrCard}>
            <MapPin size={18} color={COLORS.gold} />
            <View style={styles.addrBody}>
              <Text variant="caption" color="gold" weight="semiBold" style={styles.addrTag}>{order.delivery_address.label.toUpperCase()}</Text>
              <Text weight="medium">{order.delivery_address.full_address}</Text>
              {order.delivery_address.landmark && <Text variant="caption" color="secondary">Near {order.delivery_address.landmark}</Text>}
            </View>
          </View>
        </View>

        {/* Order items */}
        <View style={styles.section}>
          <Text variant="h3" weight="semiBold" style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemsCard}>
            {order.items.map((i, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text variant="caption" color="gold" weight="semiBold">{i.quantity}×</Text>
                <Text variant="body" style={styles.itemName}>{i.name}{i.variant_name ? ` (${i.variant_name})` : ''}</Text>
                <Text weight="semiBold" color="gold">{formatCurrency(Number(i.line_total))}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bill */}
        <View style={styles.section}>
          <View style={styles.billCard}>
            <PriceRow label="Item Total" value={formatCurrency(Number(order.subtotal))} />
            {Number(order.discount) > 0 && <PriceRow label="Discount" value={`- ${formatCurrency(Number(order.discount))}`} color={COLORS.success} />}
            <PriceRow label="Delivery Fee" value={Number(order.delivery_fee) === 0 ? 'FREE' : formatCurrency(Number(order.delivery_fee))} />
            <PriceRow label="Taxes" value={formatCurrency(Number(order.tax))} />
            <View style={styles.divider} />
            <PriceRow label="Total Paid" value={formatCurrency(Number(order.total))} bold color={COLORS.gold} />
            <View style={styles.payRow}>
              <Text variant="caption" color="secondary">Payment: {order.payment_method.toUpperCase()}</Text>
              <Text variant="caption" color="secondary">Status: {order.payment_status}</Text>
            </View>
          </View>
        </View>

        {/* Cancel button (only if received/preparing) */}
        {(order.status === 'received' || order.status === 'preparing') && (
          <Button
            label={cancelling ? 'Cancelling…' : 'Cancel Order'}
            onPress={handleCancel}
            variant="danger"
            loading={cancelling}
            style={styles.cancelBtn}
          />
        )}

        <View style={{ height: SPACING['2xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  center: { marginTop: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING['4xl'] },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.goldMuted,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    marginBottom: SPACING.lg,
  },
  cancelledBanner: { backgroundColor: 'rgba(229,72,77,0.12)', borderColor: COLORS.error },
  statusBannerText: { gap: 2 },
  stepperCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  stepRow: { flexDirection: 'row', gap: SPACING.md },
  stepIconCol: { alignItems: 'center', width: 36 },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  stepDone: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  stepActive: { backgroundColor: COLORS.gold, borderColor: COLORS.goldBright, transform: [{ scale: 1.1 }] },
  stepLine: { width: 2, flex: 1, minHeight: 24, backgroundColor: COLORS.border, marginTop: 2 },
  stepLineDone: { backgroundColor: COLORS.gold },
  stepBody: { paddingBottom: SPACING.lg, flex: 1 },
  cancelledBox: { gap: 4, paddingVertical: SPACING.md },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { marginBottom: SPACING.md },
  addrCard: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  addrBody: { flex: 1, gap: 2 },
  addrTag: { letterSpacing: 0.5 },
  itemsCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  itemRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  itemName: { flex: 1 },
  billCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.sm },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm },
  cancelBtn: { marginTop: SPACING.lg },
});
