import { Pressable, View, StyleSheet } from 'react-native';
import { Plus, Heart, Star } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '@/lib/theme';
import type { Product } from '@/lib/types';
import { CachedImage } from './CachedImage';
import { Badge } from './Badge';
import { Text } from './Text';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Minus } from 'lucide-react-native';
import { useCart } from '@/lib/cart-context';

type Props = { product: Product; onPress: (id: string) => void; onAdd?: (product: Product) => void; isFavorite?: boolean };

export function ProductCard({ product, onPress, onAdd, isFavorite }: Props) {
  const [fav, setFav] = useState(isFavorite ?? false);

  const { items, addItem, updateQty } = useCart();

  const cartItem = items.find(
     (i) => i.product.id === product.id && !i.variant && i.addons.length === 0
     );

  const toggleFav = async () => {
    const prev = fav;
    setFav(!prev);
    try {
      const { data: existing } = await supabase.from('favorites').select('id').eq('product_id', product.id).maybeSingle();
      if (existing) {
        await supabase.from('favorites').delete().eq('id', (existing as { id: string }).id);
        setFav(false);
      } else {
        await supabase.from('favorites').insert({ product_id: product.id });
        setFav(true);
      }
    } catch { setFav(prev); }
  };

  return (
    <Pressable onPress={() => onPress(product.id)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        <CachedImage uri={product.image_url} style={styles.image} />
        <View style={styles.badges}>
          {product.is_bestseller && <Badge type="bestseller" small />}
          {product.is_popular && <Badge type="popular" small />}
        </View>
        <Pressable onPress={toggleFav} style={styles.heartBtn}>
          <Heart size={16} color={fav ? COLORS.gold : COLORS.onSurface} fill={fav ? COLORS.gold : 'transparent'} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Badge type={product.is_veg ? 'veg' : 'nonveg'} small />
          <View style={styles.rating}>
            <Star size={11} color={COLORS.gold} fill={COLORS.gold} />
            <Text variant="caption" color="gold" weight="semiBold">{Number(product.rating).toFixed(1)}</Text>
          </View>
        </View>
        <Text variant="body" weight="semiBold" numberOfLines={1} style={styles.name}>{product.name}</Text>
        <Text variant="caption" color="secondary" numberOfLines={2} style={styles.desc}>{product.description}</Text>
        <View style={styles.footer}>
          <Text variant="price" color="gold">{formatCurrency(Number(product.price))}</Text>
          {cartItem ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
           style={styles.addBtn}
          onPress={() => updateQty(cartItem.key, cartItem.quantity - 1)}
          >
           <Minus size={16} color={COLORS.onGold} />
         </Pressable>

         <Text weight="semiBold">{cartItem.quantity}</Text>

        <Pressable
         style={styles.addBtn}
         onPress={() => updateQty(cartItem.key, cartItem.quantity + 1)}
        >
      <Plus size={16} color={COLORS.onGold} />
    </Pressable>
  </View>
) : (
  onAdd && (
    <Pressable
      onPress={() => onAdd(product)}
      disabled={!product.is_available}
      style={({ pressed }) => [
        styles.addBtn,
        pressed && styles.pressed,
        !product.is_available && styles.disabled,
      ]}
    >
      <Plus size={16} color={COLORS.onGold} />
    </Pressable>
  )
)}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, overflow: 'hidden', marginBottom: SPACING.md },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  imageWrap: { position: 'relative', width: '100%', height: 150 },
  image: { width: '100%', height: 150 },
  badges: { position: 'absolute', top: SPACING.sm, left: SPACING.sm, flexDirection: 'row', gap: 4 },
  heartBtn: { position: 'absolute', top: SPACING.sm, right: SPACING.sm, width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.glass, alignItems: 'center', justifyContent: 'center' },
  body: { padding: SPACING.md, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 2 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  name: { marginBottom: 2 },
  desc: { marginBottom: SPACING.sm },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { width: 32, height: 32, borderRadius: RADIUS.pill, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
