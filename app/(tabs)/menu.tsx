import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Leaf, Flame } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '@/lib/theme';
import { Text } from '@/components/Text';
import { SearchBar } from '@/components/SearchBar';
import { CategoryChip } from '@/components/CategoryChip';
import { ProductCard } from '@/components/ProductCard';
import { CartBar } from '@/components/CartBar';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';
import { useCart } from '@/lib/cart-context';
import { fetchCategories, fetchProducts, fetchFavoriteProductIds } from '@/lib/services';
import type { Category, Product } from '@/lib/types';
import { haptic } from '@/lib/utils';

type VegFilter = 'all' | 'veg' | 'nonveg';

export default function MenuScreen() {
  const params = useLocalSearchParams<{ category?: string; q?: string }>();
  const router = useRouter();
  const { count, total, addItem } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState(typeof params.q === 'string' ? params.q : '');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [vegFilter, setVegFilter] = useState<VegFilter>('all');

  const load = useCallback(async () => {
    try {
      const [cats, favs] = await Promise.all([fetchCategories(), fetchFavoriteProductIds().catch(() => new Set<string>())]);
      setCategories(cats); setFavIds(favs);
      if (params.category && cats.some((c) => c.id === params.category)) setActiveCat(params.category);
    } catch (e) { console.warn('Menu categories error', e); }
  }, [params.category]);

  const loadProducts = useCallback(async () => {
    try {
      const items = await fetchProducts({ categoryId: activeCat === 'all' ? undefined : activeCat, search: search.trim() || undefined, vegOnly: vegFilter === 'veg' });
      const filtered = vegFilter === 'nonveg' ? items.filter((p) => !p.is_veg) : items;
      setProducts(filtered);
    } catch (e) { console.warn('Menu products error', e); setProducts([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [activeCat, search, vegFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadProducts(); }, [loadProducts]);
  const onRefresh = () => { setRefreshing(true); Promise.all([load(), loadProducts()]).finally(() => setRefreshing(false)); };
  const goToProduct = (id: string) => router.push(`/product/${id}`);
  const quickAdd = (p: Product) => { haptic.light(); addItem(p, null, [], 1); };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.sticky}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search for dishes\u2026" />
        <View style={styles.filtersRow}>
          <Pressable onPress={() => { haptic.selection(); setVegFilter('all'); }} style={({ pressed }) => [styles.filterPill, vegFilter === 'all' && styles.filterActive, pressed && { transform: [{ scale: 0.96 }] }]}><Text variant="caption" weight="semiBold" color={vegFilter === 'all' ? 'gold' : 'secondary'}>All</Text></Pressable>
          <Pressable onPress={() => { haptic.selection(); setVegFilter('veg'); }} style={({ pressed }) => [styles.filterPill, vegFilter === 'veg' && styles.filterActive, pressed && { transform: [{ scale: 0.96 }] }]}><Leaf size={13} color={vegFilter === 'veg' ? COLORS.gold : COLORS.onSurfaceSecondary} /><Text variant="caption" weight="semiBold" color={vegFilter === 'veg' ? 'gold' : 'secondary'}>Veg</Text></Pressable>
          <Pressable onPress={() => { haptic.selection(); setVegFilter('nonveg'); }} style={({ pressed }) => [styles.filterPill, vegFilter === 'nonveg' && styles.filterActive, pressed && { transform: [{ scale: 0.96 }] }]}><Flame size={13} color={vegFilter === 'nonveg' ? COLORS.gold : COLORS.onSurfaceSecondary} /><Text variant="caption" weight="semiBold" color={vegFilter === 'nonveg' ? 'gold' : 'secondary'}>Non-Veg</Text></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
          <CategoryChip label="All" selected={activeCat === 'all'} onPress={() => { haptic.selection(); setActiveCat('all'); }} />
          {categories.map((c) => (<CategoryChip key={c.id} label={c.name} selected={activeCat === c.id} onPress={() => { haptic.selection(); setActiveCat(c.id); }} />))}
        </ScrollView>
      </View>
      <FlatList data={products} keyExtractor={(i) => i.id} numColumns={2} contentContainerStyle={styles.list} columnWrapperStyle={styles.row} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />} ListEmptyComponent={loading ? (<View style={styles.skeletonGrid}>{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</View>) : (<EmptyState title="No dishes found" subtitle="Try a different category or search term." />)} renderItem={({ item }) => (<ProductCard product={item} onPress={goToProduct} onAdd={item.product_variants?.length ? undefined : quickAdd} isFavorite={favIds.has(item.id)} />)} />
      <CartBar count={count} total={total} onPress={() => router.push('/(tabs)/cart')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  sticky: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm },
  filtersRow: { flexDirection: 'row', gap: SPACING.sm },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.goldMuted, borderColor: COLORS.goldBorder },
  catChips: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING['4xl'] },
  row: { gap: SPACING.md, marginBottom: SPACING.md },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
});
