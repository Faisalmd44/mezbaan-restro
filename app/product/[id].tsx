import { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Heart, Star, Share, ShoppingBag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '@/lib/theme';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { CachedImage } from '@/components/CachedImage';
import { QuantityStepper } from '@/components/QuantityStepper';
import { EmptyState } from '@/components/EmptyState';
import { ProductCard } from '@/components/ProductCard';
import { fetchProductById, fetchSimilarProducts, fetchFavoriteProductIds } from '@/lib/services';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/lib/cart-context';
import type { Product, ProductVariant, ProductAddon } from '@/lib/types';
import { formatCurrency, haptic } from '@/lib/utils';

const { width: SCREEN_W } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [fav, setFav] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [p, favs] = await Promise.all([
        fetchProductById(id),
        fetchFavoriteProductIds().catch(() => new Set<string>()),
      ]);
      setProduct(p);
      setFavIds(favs);
      setFav(favs.has(id));
      if (p) {
        setSimilar(await fetchSimilarProducts(id, p.category_id, 4).catch(() => []));
        if (p.product_variants && p.product_variants.length > 0) {
          setSelectedVariant(p.product_variants[0]);
        }
      }
    } catch (e) {
      setError('Failed to load product.');
      console.warn('ProductDetail load', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleFav = async () => {
    if (!product) return;
    const prev = fav;
    setFav(!prev);
    haptic.light();
    try {
      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('product_id', product.id)
        .maybeSingle();
      if (existing) {
        await supabase.from('favorites').delete().eq('id', (existing as { id: string }).id);
        setFav(false);
      } else {
        await supabase.from('favorites').insert({ product_id: product.id });
        setFav(true);
      }
    } catch {
      setFav(prev);
    }
  };

  const toggleAddon = (a: ProductAddon) => {
    setSelectedAddons((prev) => {
      const next = new Set(prev);
      if (next.has(a.id)) next.delete(a.id);
      else next.add(a.id);
      return next;
    });
    haptic.selection();
  };

  const handleAddToCart = () => {
    if (!product) return;
    const addons = (product.product_addons ?? []).filter((a) => selectedAddons.has(a.id));
    addItem(product, selectedVariant, addons, quantity);
    haptic.success();
    router.back();
  };

  const unitPrice = product
    ? Number(selectedVariant?.price ?? product.price) +
      (product.product_addons ?? []).filter((a) => selectedAddons.has(a.id)).reduce((s, a) => s + Number(a.price), 0)
    : 0;
  const lineTotal = unitPrice * quantity;

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title="Item not found"
          subtitle={error ?? 'This item may have been removed.'}
          actionLabel="Back to Menu"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const variants = product.product_variants ?? [];
  const addons = product.product_addons ?? [];

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero image */}
        <View style={styles.heroWrap}>
          <CachedImage uri={product.image_url} style={styles.heroImg} />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(10,10,11,0.95)']}
            style={styles.heroScrim}
          />
          <SafeAreaView edges={['top']} style={styles.heroNav}>
            <Pressable onPress={() => router.back()} style={styles.navBtn}>
              <ChevronLeft size={22} color={COLORS.onSurface} />
            </Pressable>
            <View style={styles.navRow}>
              <Pressable style={styles.navBtn}>
                <Share size={18} color={COLORS.onSurface} />
              </Pressable>
              <Pressable onPress={toggleFav} style={styles.navBtn}>
                <Heart size={20} color={fav ? COLORS.gold : COLORS.onSurface} fill={fav ? COLORS.gold : 'transparent'} />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.badgeRow}>
            <Badge type={product.is_veg ? 'veg' : 'nonveg'} />
            {product.is_bestseller && <Badge type="bestseller" />}
            {product.is_popular && <Badge type="popular" />}
            {product.is_new && <Badge type="new" />}
            {product.is_combo && <Badge type="combo" />}
          </View>

          <Text variant="h2" weight="bold" style={styles.title}>{product.name}</Text>

          <View style={styles.metaRow}>
            <View style={styles.rating}>
              <Star size={14} color={COLORS.gold} fill={COLORS.gold} />
              <Text weight="semiBold" color="gold">{Number(product.rating).toFixed(1)}</Text>
            </View>
            <Text variant="price" color="gold" style={styles.price}>{formatCurrency(Number(selectedVariant?.price ?? product.price))}</Text>
          </View>

          {product.description && (
            <Text variant="body" color="secondary" style={styles.desc}>{product.description}</Text>
          )}

          {/* Variants */}
          {variants.length > 0 && (
            <View style={styles.section}>
              <Text variant="h3" weight="semiBold" style={styles.sectionTitle}>Choose Size</Text>
              <View style={styles.variantRow}>
                {variants.map((v) => (
                  <Pressable
                    key={v.id}
                    onPress={() => { haptic.selection(); setSelectedVariant(v); }}
                    style={({ pressed }) => [
                      styles.variantChip,
                      selectedVariant?.id === v.id && styles.variantActive,
                      pressed && { transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    <Text weight="semiBold" color={selectedVariant?.id === v.id ? 'gold' : 'secondary'}>{v.name}</Text>
                    <Text variant="caption" color={selectedVariant?.id === v.id ? 'gold' : 'tertiary'}>{formatCurrency(Number(v.price))}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Addons */}
          {addons.length > 0 && (
            <View style={styles.section}>
              <Text variant="h3" weight="semiBold" style={styles.sectionTitle}>Add Extras</Text>
              {addons.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => toggleAddon(a)}
                  style={({ pressed }) => [styles.addonRow, pressed && { opacity: 0.85 }]}
                >
                  <View style={styles.addonLeft}>
                    <View style={[styles.checkbox, selectedAddons.has(a.id) && styles.checkboxActive]}>
                      {selectedAddons.has(a.id) && <Text color="gold" weight="bold">✓</Text>}
                    </View>
                    <Text weight="medium">{a.name}</Text>
                  </View>
                  <Text color="gold" weight="semiBold">+{formatCurrency(Number(a.price))}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Quantity */}
          <View style={styles.section}>
            <Text variant="h3" weight="semiBold" style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.qtyRow}>
              <QuantityStepper value={quantity} onDecrement={() => setQuantity((q) => Math.max(1, q - 1))} onIncrement={() => setQuantity((q) => q + 1)} />
              <Text variant="body" color="secondary">{formatCurrency(unitPrice)} each</Text>
            </View>
          </View>

          {/* Similar products */}
          {similar.length > 0 && (
            <View style={styles.section}>
              <Text variant="h3" weight="semiBold" style={styles.sectionTitle}>You may also like</Text>
              <View style={styles.similarGrid}>
                {similar.map((s) => (
                  <View key={s.id} style={styles.similarCol}>
                    <ProductCard product={s} onPress={(pid) => router.push(`/product/${pid}`)} isFavorite={favIds.has(s.id)} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reviews placeholder */}
          <View style={styles.section}>
            <Text variant="h3" weight="semiBold" style={styles.sectionTitle}>Reviews</Text>
            <View style={styles.reviewCard}>
              <View style={styles.reviewHead}>
                <Star size={16} color={COLORS.gold} fill={COLORS.gold} />
                <Text weight="semiBold" color="gold">{Number(product.rating).toFixed(1)}</Text>
                <Text variant="caption" color="tertiary">· Based on customer ratings</Text>
              </View>
              <Text variant="body" color="secondary">Customer reviews will appear here once the reviews system is live.</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sticky add-to-cart bar */}
      <View style={styles.ctaBar}>
        <View>
          <Text variant="caption" color="secondary">Total</Text>
          <Text variant="h3" weight="bold" color="gold">{formatCurrency(lineTotal)}</Text>
        </View>
        <Button
          label={product.is_available ? 'Add to Cart' : 'Out of Stock'}
          onPress={handleAddToCart}
          disabled={!product.is_available}
          size="lg"
          style={styles.ctaBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  loadingWrap: { flex: 1, backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 0 },
  heroWrap: { position: 'relative', width: '100%', height: 340 },
  heroImg: { width: '100%', height: 340 },
  heroScrim: { ...StyleSheet.absoluteFillObject },
  heroNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  navRow: { flexDirection: 'row', gap: SPACING.sm },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderStrong,
  },
  body: {
    marginTop: -SPACING.xl,
    backgroundColor: COLORS.black,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
  title: { marginBottom: SPACING.xs },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { fontSize: TYPOGRAPHY.xl },
  desc: { lineHeight: 22, marginBottom: SPACING.lg },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { marginBottom: SPACING.md },
  variantRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  variantChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 2,
  },
  variantActive: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.goldMuted,
  },
  addonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  addonLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { borderColor: COLORS.gold, backgroundColor: COLORS.goldMuted },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  similarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  similarCol: { width: '47%', flexGrow: 0, flexBasis: '47%' },
  reviewCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
