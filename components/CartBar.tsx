import { View, StyleSheet, Pressable } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/lib/theme';
import { Text } from './Text';
import { formatCurrency, haptic } from '@/lib/utils';

type Props = { count: number; total: number; onPress: () => void };

export function CartBar({ count, total, onPress }: Props) {
  if (count === 0) return null;
  return (
    <Pressable onPress={() => { haptic.light(); onPress(); }} style={({ pressed }) => [styles.press, pressed && styles.pressed]}>
      <LinearGradient colors={[COLORS.goldDeep, COLORS.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bar}>
        <View style={styles.left}>
          <View style={styles.bagWrap}>
            <ShoppingBag size={18} color={COLORS.onGold} />
            <View style={styles.countBadge}>
              <Text variant="caption" weight="bold" color="gold" style={styles.countText}>{count}</Text>
            </View>
          </View>
          <View>
            <Text variant="caption" color="gold" style={styles.label}>{count} item{count > 1 ? 's' : ''} • {formatCurrency(total)}</Text>
            <Text weight="semiBold" color="gold" style={styles.cta}> View Cart → </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
  position: 'absolute',
  left: SPACING.lg,
  right: SPACING.lg,
  bottom: 85,
  zIndex: 999,
},
  pressed: { transform: [{ scale: 0.98 }] },
  bar: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderRadius: RADIUS.pill,
  paddingHorizontal: SPACING.lg,
  paddingVertical: SPACING.md,

  elevation: 10,
  shadowOpacity: 0.25,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
},
  left: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  bagWrap: { position: 'relative', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  countBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.black, borderWidth: 1.5, borderColor: COLORS.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countText: { fontSize: 10 },
  label: { opacity: 0.85 },
  cta: { fontSize: TYPOGRAPHY.base },
});
