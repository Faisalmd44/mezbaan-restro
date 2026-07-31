import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Receipt, ChevronRight, RotateCcw } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '@/lib/theme';
import { Text } from '@/components/Text';
import { EmptyState } from '@/components/EmptyState';
import { useCart } from '@/lib/cart-context';
import { fetchOrders, fetchProducts } from '@/lib/services';
import { useAuth } from '@/lib/auth-context';
import type { Order, Product } from '@/lib/types';
import { formatCurrency, formatDateTime, ORDER_STATUS_LABELS, haptic } from '@/lib/utils';

const statusColors: Record<string, string> = {
  received: COLORS.info,
  preparing: COLORS.warning,
  packed: COLORS.warning,
  out_for_delivery: COLORS.info,
  delivered: COLORS.success,
  cancelled: COLORS.error,
};

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addItem, clear } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const o = await fetchOrders();
      setOrders(o);
    } catch (e) {
      console.warn('orders load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleReorder = async (order: Order) => {
    haptic.light();
    clear();
    // Fetch fresh product records for each line and re-add to cart
    const productIds = [...new Set(order.items.map((i) => i.product_id))];
    const products = await fetchProducts().catch(() => [] as Product[]);
    for (const line of order.items) {
      const p = products.find((x) => x.id === line.product_id);
      if (p) addItem(p, null, [], line.quantity);
    }
    router.push('/(tabs)/cart');
  };

  if (!loading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.header}>
          <Text variant="h2" weight="bold">Your Orders</Text>
        </View>
        <EmptyState
          icon={<Receipt size={32} color={COLORS.gold} />}
          title="No orders yet"
          subtitle="Your order history will appear here once you place your first order."
          actionLabel="Browse Menu"
          onAction={() => router.push('/(tabs)/menu')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h2" weight="bold">Your Orders</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
        showsVerticalScrollIndicator={false}
      >
        {orders.map((order, idx) => (
          <Pressable
            key={order.id}
            onPress={() => router.push(`/tracking/${order.id}`)}
            style={({ pressed }) => [styles.orderCard, pressed && { transform: [{ scale: 0.99 }] }]}
          >
            <View style={styles.orderHead}>
              <View>
                <Text variant="caption" color="tertiary">{order.order_no}</Text>
                <Text weight="semiBold">{formatDateTime(order.created_at)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColors[order.status]}22`, borderColor: statusColors[order.status] }]}>
                <Text variant="caption" weight="semiBold" style={{ color: statusColors[order.status] }}>{ORDER_STATUS_LABELS[order.status]}</Text>
              </View>
            </View>

           <View style={styles.orderItems}>
  {Array.isArray(order.items) &&
    order.items.slice(0, 3).map((i: any, iidx: number) => (
      <Text
        key={iidx}
        variant="caption"
        color="secondary"
        numberOfLines={1}
      >
        {i.quantity}× {i.name}
        {i.variant_name ? ` (${i.variant_name})` : ""}
      </Text>
    ))}

  {Array.isArray(order.items) && order.items.length > 3 && (
    <Text variant="caption" color="tertiary">
      +{order.items.length - 3} more items
    </Text>
  )}
</View>

            <View style={styles.orderFooter}>
              <Text variant="price" color="gold">{formatCurrency(Number(order.total))}</Text>
              <View style={styles.footerActions}>
                {idx === 0 && order.status !== 'cancelled' && (
                  <Pressable onPress={(e) => { e.stopPropagation?.(); handleReorder(order); }} style={styles.reorderBtn}>
                    <RotateCcw size={13} color={COLORS.gold} />
                    <Text variant="caption" color="gold" weight="semiBold">Reorder</Text>
                  </Pressable>
                )}
                <View style={styles.trackBtn}>
                  <Text variant="caption" color="secondary" weight="semiBold">Track</Text>
                  <ChevronRight size={14} color={COLORS.onSurfaceSecondary} />
                </View>
              </View>
            </View>
          </Pressable>
        ))}
        <View style={{ height: SPACING['4xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING['4xl'] },
  orderCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1 },
  orderItems: { gap: 2 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  reorderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.pill, backgroundColor: COLORS.goldMuted },
  trackBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
