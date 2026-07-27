import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, ShoppingBag, Gift, Wallet, Info, CheckCheck } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '@/lib/theme';
import { Text } from '@/components/Text';
import { EmptyState } from '@/components/EmptyState';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/services';
import type { AppNotification, NotificationType } from '@/lib/types';
import { timeAgo, haptic } from '@/lib/utils';

const typeIcons: Record<NotificationType, React.ReactNode> = {
  order: <ShoppingBag size={18} color={COLORS.gold} />,
  promo: <Gift size={18} color={COLORS.gold} />,
  wallet: <Wallet size={18} color={COLORS.gold} />,
  system: <Info size={18} color={COLORS.gold} />,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const n = await fetchNotifications();
      setNotifications(n);
    } catch (e) {
      console.warn('notif load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const handlePress = async (n: AppNotification) => {
    if (!n.is_read) {
      await markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
    }
    haptic.light();
    if (n.type === 'order' && n.data?.order_id) {
      router.push(`/tracking/${n.data.order_id as string}`);
    }
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead().catch(() => {});
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    haptic.success();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.onSurface} />
        </Pressable>
        <Text variant="h2" weight="bold">Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={handleMarkAll} style={styles.markAllBtn}>
            <CheckCheck size={16} color={COLORS.gold} />
            <Text variant="caption" color="gold" weight="semiBold">Mark all</Text>
          </Pressable>
        ) : <View style={{ width: 40 }} />}
      </View>

      {!loading && notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={32} color={COLORS.gold} />}
          title="No notifications"
          subtitle="Order updates and offers will appear here."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePress(item)}
              style={({ pressed }) => [styles.notifCard, !item.is_read && styles.unread, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.notifIcon, !item.is_read && styles.unreadIcon]}>{typeIcons[item.type]}</View>
              <View style={styles.notifBody}>
                <View style={styles.notifHead}>
                  <Text weight="semiBold" style={!item.is_read && styles.unreadText}>{item.title}</Text>
                  {!item.is_read && <View style={styles.unreadDot} />}
                </View>
                {item.body && <Text variant="caption" color="secondary" numberOfLines={2}>{item.body}</Text>}
                <Text variant="caption" color="tertiary">{timeAgo(item.created_at)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING['4xl'] },
  notifCard: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  unread: { borderColor: COLORS.goldBorder, backgroundColor: COLORS.goldMuted },
  notifIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceTertiary, alignItems: 'center', justifyContent: 'center' },
  unreadIcon: { backgroundColor: 'rgba(224,178,82,0.2)' },
  notifBody: { flex: 1, gap: 2 },
  notifHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unreadText: { color: COLORS.gold },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.gold },
});
