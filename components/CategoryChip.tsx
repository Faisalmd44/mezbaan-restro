import { Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/lib/theme';
import { Text } from './Text';

type Props = { label: string; selected: boolean; onPress: () => void; style?: StyleProp<ViewStyle> };

export function CategoryChip({ label, selected, onPress, style }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && { transform: [{ scale: 0.96 }] }, style]}>
      <Text weight="semiBold" style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border },
  selected: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  text: { fontSize: TYPOGRAPHY.sm, color: COLORS.onSurfaceSecondary },
  selectedText: { color: COLORS.onGold },
});
