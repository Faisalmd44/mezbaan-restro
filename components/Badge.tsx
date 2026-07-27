import { View, StyleSheet } from 'react-native';
import { Star, Flame, TrendingUp, Sparkles, Zap } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/lib/theme';
import { Text } from '@/components/Text';

type BadgeType = 'veg' | 'nonveg' | 'bestseller' | 'popular' | 'new' | 'combo' | 'out_of_stock' | 'rating';

type Props = {
  type: BadgeType;
  rating?: number;
  small?: boolean;
};

export function Badge({ type, rating, small }: Props) {
  const config = getBadgeConfig(type, rating);
  return (
    <View style={[styles.wrap, small && styles.small, { backgroundColor: config.bg, borderColor: config.border }]}>
      {config.icon}
      <Text style={[styles.text, small && styles.smallText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function getBadgeConfig(type: BadgeType, rating?: number) {
  switch (type) {
    case 'veg':
      return { label: 'Veg', bg: 'rgba(48,164,108,0.15)', border: COLORS.green, color: COLORS.green, icon: <View style={styles.dot} /> };
    case 'nonveg':
      return { label: 'Non-Veg', bg: 'rgba(229,72,77,0.15)', border: COLORS.red, color: COLORS.red, icon: <View style={[styles.dot, { backgroundColor: COLORS.red }]} /> };
    case 'bestseller':
      return { label: 'Bestseller', bg: 'rgba(224,178,82,0.18)', border: COLORS.gold, color: COLORS.gold, icon: <Flame size={11} color={COLORS.gold} /> };
    case 'popular':
      return { label: 'Popular', bg: 'rgba(245,166,35,0.15)', border: COLORS.warning, color: COLORS.warning, icon: <TrendingUp size={11} color={COLORS.warning} /> };
    case 'new':
      return { label: 'New', bg: 'rgba(2,136,209,0.15)', border: COLORS.info, color: COLORS.info, icon: <Sparkles size={11} color={COLORS.info} /> };
    case 'combo':
      return { label: 'Combo', bg: 'rgba(224,178,82,0.18)', border: COLORS.gold, color: COLORS.gold, icon: <Zap size={11} color={COLORS.gold} /> };
    case 'out_of_stock':
      return { label: 'Out of Stock', bg: 'rgba(229,72,77,0.15)', border: COLORS.error, color: COLORS.error, icon: null };
    case 'rating':
      return { label: rating ? rating.toFixed(1) : '4.5', bg: 'rgba(224,178,82,0.18)', border: COLORS.gold, color: COLORS.gold, icon: <Star size={11} color={COLORS.gold} fill={COLORS.gold} /> };
  }
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm + 2, paddingVertical: 3, borderRadius: RADIUS.sm, borderWidth: 1 },
  small: { paddingHorizontal: 6, paddingVertical: 2 },
  text: { fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontSize: TYPOGRAPHY.xs },
  smallText: { fontSize: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: COLORS.green },
});
