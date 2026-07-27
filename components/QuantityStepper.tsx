import { View, StyleSheet, Pressable } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '@/lib/theme';
import { Text } from './Text';
import { haptic } from '@/lib/utils';

type Props = { value: number; onDecrement: () => void; onIncrement: () => void; size?: 'sm' | 'md' };

export function QuantityStepper({ value, onDecrement, onIncrement, size = 'md' }: Props) {
  const dim = size === 'sm' ? 26 : 32;
  return (
    <View style={[styles.wrap, size === 'sm' && styles.sm]}>
      <Pressable onPress={() => { haptic.light(); onDecrement(); }} style={({ pressed }) => [styles.btn, { width: dim, height: dim }, pressed && styles.pressed]}>
        <Minus size={size === 'sm' ? 13 : 16} color={COLORS.onGold} />
      </Pressable>
      <Text weight="semiBold" style={styles.value}>{value}</Text>
      <Pressable onPress={() => { haptic.light(); onIncrement(); }} style={({ pressed }) => [styles.btn, { width: dim, height: dim }, pressed && styles.pressed]}>
        <Plus size={size === 'sm' ? 13 : 16} color={COLORS.onGold} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceTertiary, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.goldBorder, paddingHorizontal: 4, paddingVertical: 4, gap: 6 },
  sm: { paddingHorizontal: 2, paddingVertical: 2 },
  btn: { borderRadius: RADIUS.pill, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.9 }] },
  value: { minWidth: 24, textAlign: 'center', color: COLORS.onSurface },
});
