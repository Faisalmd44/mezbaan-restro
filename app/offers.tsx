import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Tag, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/lib/theme';
import { Text } from '@/components/Text';
import { CachedImage } from '@/components/CachedImage';
import { EmptyState } from '@/components/EmptyState';
import { fetchOffers, fetchCoupons } from '@/lib/services';
import type { Offer, Coupon } from '@/lib/types';
import { formatCurrency, haptic } from '@/lib/utils';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - SPACING.lg * 2;

export default function OffersScreen() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, c] = await Promise.all([fetchOffers(), fetchCoupons()]);
      setOffers(o);
      setCoupons(c);
    } catch (e) {
      console.warn('offers load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const renderOffer = ({ item }: { item: Offer }) => (
    <Pressable
      onPress={() => { haptic.light(); router.push('/(tabs)/menu'); }}
      style={({ pressed }) => [styles.offerCard, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <CachedImage uri={item.image_url} style={styles.offerImg} />
      <View style={styles.offerScrim} />
      <View style={styles.offerContent}>
        <Text variant="h3" weight="bold" color="primary">{item.title}</Text>
        {item.subtitle && <Text variant="caption" color="primary">{item.subtitle}</Text>}
        {item.cta_label && (
          <View style={styles.offerCta}>
            <Text variant="caption" color="gold" weight="semiBold">{item.cta_label}</Text>
            <ChevronRight size={14} color={COLORS.gold} />
          </View>
        )}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.onSurface} />
        </Pressable>
        <Text variant="h2" weight="bold">Offers</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={offers}
        keyExtractor={(i) => i.id}
        renderItem={renderOffer}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
        ListHeaderComponent={
          <>
            <Text variant="h3" weight="semiBold" style={styles.sectionTitle}>Featured Offers</Text>
          </>
        }
        ListFooterComponent={
          <View style={styles.couponsSection}>
            <Text variant="h3" weight="semiBold" style={styles.sectionTitle}>Available Coupons</Text>
            {coupons.map((c) => (
              <View key={c.id} style={styles.couponCard}>
                <View style={styles.couponLeft}>
                  <View style={styles.couponCodeTag}>
                    <Tag size={13} color={COLORS.gold} />
                    <Text variant="caption" color="gold" weight="bold">{c.code}</Text>
                  </View>
                </View>
                <View style={styles.couponMid}>
                  <Text weight="semiBold">{c.description}</Text>
                  <Text variant="caption" color="tertiary">Min order {formatCurrency(Number(c.min_order))}{c.first_order_only ? ' · First order only' : ''}</Text>
                </View>
                <View style={styles.couponRight}>
                  <Text variant="h3" weight="bold" color="gold">{c.discount_type === 'percent' ? `${c.discount_value}%` : formatCurrency(Number(c.discount_value))}</Text>
                  <Text variant="caption" color="tertiary">OFF</Text>
                </View>
              </View>
            ))}
            <View style={{ height: SPACING['2xl'] }} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING['4xl'] },
  sectionTitle: { marginBottom: SPACING.md, marginTop: SPACING.lg },
  offerCard: {
    width: CARD_W,
    height: 170,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  offerImg: { width: '100%', height: '100%' },
  offerScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.scrim },
  offerContent: { position: 'absolute', bottom: SPACING.lg, left: SPACING.lg, right: SPACING.lg },
  offerCta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: SPACING.xs },
  couponsSection: { marginTop: SPACING.lg },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  couponLeft: { width: 60 },
  couponCodeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    backgroundColor: COLORS.goldMuted,
  },
  couponMid: { flex: 1, gap: 2 },
  couponRight: { alignItems: 'center' },
});
