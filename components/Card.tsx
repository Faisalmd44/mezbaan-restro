import { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/lib/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  glass?: boolean;
  gold?: boolean;
};

export function Card({ children, style, padded = true, glass = false, gold = false }: Props) {
  return (
    <View
      style={[
        styles.base, padded && styles.padded, glass && styles.glass, gold && styles.gold,
        gold && SHADOWS.gold, !glass && !gold && SHADOWS.card, style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  padded: { padding: SPACING.lg },
  glass: { backgroundColor: COLORS.glass, borderColor: COLORS.borderStrong },
  gold: { backgroundColor: COLORS.surfaceSecondary, borderColor: COLORS.goldBorder },
});
