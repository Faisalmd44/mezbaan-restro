import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Bell, Heart, ChevronRight } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/lib/theme';
import { Text } from '@/components/Text';
import { SearchBar } from '@/components/SearchBar';
import { SectionHeader } from '@/components/SectionHeader';
import { ProductCard } from '@/components/ProductCard';
import { CartBar } from '@/components/CartBar';
import { CachedImage } from '@/components/CachedImage';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';
import { useCart } from '@/lib/cart-context';
import { fetchCategories, fetchProducts, fetchOffers, fetchFavoriteProductIds } from '@/lib/services';
import type { Category, Product, Offer } from '@/lib/types';
import { haptic } from '@/lib/utils';

const { width: SCREEN_W } = Dimensions.get('window');
const BANNER_W = SCREEN_W - SPACING.lg * 2;

export default function HomeScreen() {
  const router = useRouter();
  const { count, total, addItem } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [popular, setPopular] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Product[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
const [cats, favs, items] = await Promise.all([
  fetchCategories(),
  fetchFavoriteProductIds().catch(() => new Set<string>()),
  fetchProducts({ limit: 20 }),
]);

  setCategories(cats);
  setFavIds(favs);
  setOffers([]);
  setPopular(items);
  setBestsellers(items.filter(p => p.is_bestseller));
  setNewArrivals([]);
  setCombos([]);
    } catch (e) { console.warn('Home load error', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };
  const goToProduct = (id: string) => router.push(`/product/${id}`);
  const goToCategory = (catId: string) => router.push({ pathname: '/(tabs)/menu', params: { category: catId } });
  const quickAdd = (p: Product) => { haptic.light(); addItem(p, null, [], 1); };

  const renderOffer = ({ item }: { item: Offer }) => (
    <Pressable onPress={() => router.push('/(tabs)/menu')} style={({ pressed }) => [styles.banner, pressed && { transform: [{ scale: 0.98 }] }]}>
      <CachedImage uri={item.image_url} style={styles.bannerImg} />
      <View style={styles.bannerScrim} />
      <View style={styles.bannerContent}>
        <Text variant="h3" weight="bold" color="primary">{item.title}</Text>
        {item.subtitle && <Text variant="caption" color="primary" style={styles.bannerSub}>{item.subtitle}</Text>}
        {item.cta_label && (
          <View style={styles.bannerCta}>
            <Text variant="caption" color="gold" weight="semiBold">{item.cta_label}</Text>
            <ChevronRight size={14} color={COLORS.gold} />
          </View>
        )}
      </View>
    </Pressable>
  );

  const renderCategory = ({ item }: { item: Category }) => (
    <Pressable onPress={() => goToCategory(item.id)} style={styles.catItem}>
      <View style={styles.catCircle}><CachedImage uri={item.image_url} style={styles.catImg} /></View>
      <Text variant="caption" weight="medium" style={styles.catLabel} numberOfLines={1}>{item.name}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MapPin size={16} color={COLORS.gold} />
            <View>
              <Text variant="label" color="tertiary">Deliver to</Text>
              <Pressable onPress={() => router.push('/address-list')}><Text weight="semiBold" color="primary" style={styles.location}>Jamia Nagar, Delhi</Text></Pressable>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => router.push('/wishlist')} style={styles.iconBtn}><Heart size={20} color={COLORS.onSurface} /></Pressable>
            <Pressable onPress={() => router.push('/notifications')} style={styles.iconBtn}><Bell size={20} color={COLORS.onSurface} /></Pressable>
          </View>
        </View>
        <View style={styles.searchWrap}><SearchBar value={search} onChangeText={setSearch} onSubmit={() => router.push({ pathname: '/(tabs)/menu', params: { q: search } })} /></View>
        {loading ? (
          <View style={styles.bannerWrap}><Skeleton width={BANNER_W} height={160} radius={RADIUS.lg} /></View>
        ) : offers.length > 0 ? (
          <FlatList data={offers} renderItem={renderOffer} keyExtractor={(i) => i.id} horizontal pagingEnabled showsHorizontalScrollIndicator={false} snapToInterval={BANNER_W + SPACING.md} decelerationRate="fast" contentContainerStyle={styles.bannerList} />
        ) : null}
        <SectionHeader title="Categories" actionLabel="See all" onAction={() => router.push('/(tabs)/menu')} />
        {loading ? (
          <View style={styles.catRow}>{[1,2,3,4].map(i => <Skeleton key={i} width={72} height={72} radius={36} />)}</View>
        ) : (
          <FlatList data={categories} renderItem={renderCategory} keyExtractor={(i) => i.id} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catList} />
        )}
        <SectionHeader title="Popular Items" actionLabel="See all" onAction={() => router.push('/(tabs)/menu')} />
        {loading ? (
          <View style={styles.productGrid}>{[1,2].map(i => <SkeletonCard key={i} />)}</View>
        ) : (
          <View style={styles.productGrid}>{popular.slice(0, 4).map((p) => (
            <View key={p.id} style={styles.productCol}><ProductCard product={p} onPress={goToProduct} onAdd={p.product_variants?.length ? undefined : quickAdd} isFavorite={favIds.has(p.id)} /></View>
          ))}</View>
        )}
        {bestsellers.length > 0 && (<><SectionHeader title="Best Sellers" actionLabel="See all" onAction={() => router.push('/(tabs)/menu')} /><View style={styles.productGrid}>{bestsellers.slice(0, 4).map((p) => (<View key={p.id} style={styles.productCol}><ProductCard product={p} onPress={goToProduct} onAdd={p.product_variants?.length ? undefined : quickAdd} isFavorite={favIds.has(p.id)} /></View>))}</View></>)}
        {newArrivals.length > 0 && (<><SectionHeader title="New Arrivals" /><View style={styles.productGrid}>{newArrivals.slice(0, 4).map((p) => (<View key={p.id} style={styles.productCol}><ProductCard product={p} onPress={goToProduct} onAdd={p.product_variants?.length ? undefined : quickAdd} isFavorite={favIds.has(p.id)} /></View>))}</View></>)}
        {combos.length > 0 && (<><SectionHeader title="Combo Deals" actionLabel="See all" onAction={() => router.push('/(tabs)/menu')} /><View style={styles.productGrid}>{combos.slice(0, 4).map((p) => (<View key={p.id} style={styles.productCol}><ProductCard product={p} onPress={goToProduct} onAdd={p.product_variants?.length ? undefined : quickAdd} isFavorite={favIds.has(p.id)} /></View>))}</View></>)}
        <View style={{ height: SPACING['4xl'] }} />
      </ScrollView>
      <CartBar count={count} total={total} onPress={() => router.push('/(tabs)/cart')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  headerRight: { flexDirection: 'row', gap: SPACING.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  location: { fontSize: 15 },
  searchWrap: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  bannerWrap: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  bannerList: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  banner: { width: BANNER_W, height: 160, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.card },
  bannerImg: { width: '100%', height: '100%' },
  bannerScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.scrim },
  bannerContent: { position: 'absolute', bottom: SPACING.lg, left: SPACING.lg, right: SPACING.lg },
  bannerSub: { opacity: 0.9, marginTop: 2 },
  bannerCta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: SPACING.sm },
  catRow: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  catList: { paddingHorizontal: SPACING.lg, gap: SPACING.md, marginBottom: SPACING.sm },
  catItem: { alignItems: 'center', width: 80, gap: SPACING.xs },
  catCircle: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', borderWidth: 1.5, borderColor: COLORS.goldBorder, ...SHADOWS.card },
  catImg: { width: '100%', height: '100%' },
  catLabel: { textAlign: 'center' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg, gap: SPACING.md },
  productCol: { width: '47%', flexGrow: 0, flexBasis: '47%' },
});
