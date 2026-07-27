import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Heart } from 'lucide-react-native';
import { COLORS, SPACING } from '@/lib/theme';
import { Text } from '@/components/Text';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { fetchFavorites } from '@/lib/services';
import { useCart } from '@/lib/cart-context';
import type { Favorite } from '@/lib/types';
import { haptic } from '@/lib/utils';

export default function WishlistScreen() {
  const router = useRouter();
  const { addItem } = useCart();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const f = await fetchFavorites();
      setFavorites(f);
    } catch (e) {
      console.warn('wishlist load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const goToProduct = (id: string) => router.push(`/product/${id}`);
  const quickAdd = (p: any) => { haptic.light(); addItem(p, null, [], 1); };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.onSurface} />
        </Pressable>
        <Text variant="h2" weight="bold">Wishlist</Text>
        <View style={{ width: 40 }} />
      </View>

      {!loading && favorites.length === 0 ? (
        <EmptyState
          icon={<Heart size={32} color={COLORS.gold} />}
          title="No favorites yet"
          subtitle="Tap the heart icon on any dish to save it here."
          actionLabel="Browse Menu"
          onAction={() => router.push('/(tabs)/menu')}
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(i) => i.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
          renderItem={({ item }) => (
            item.product ? (
              <View style={styles.col}>
                <ProductCard
                  product={item.product}
                  onPress={goToProduct}
                  onAdd={item.product.product_variants?.length ? undefined : quickAdd}
                  isFavorite={true}
                />
              </View>
            ) : null
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
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING['4xl'] },
  row: { gap: SPACING.md, marginBottom: SPACING.md },
  col: { width: '47%', flexGrow: 0, flexBasis: '47%' },
});
