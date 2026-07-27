import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/lib/theme';

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label' | 'price';
type Weight = 'regular' | 'medium' | 'semiBold' | 'bold';
type Color = 'primary' | 'secondary' | 'tertiary' | 'gold' | 'error' | 'success';

type Props = TextProps & {
  variant?: Variant;
  weight?: Weight;
  color?: Color;
};

export function Text({ variant = 'body', weight = 'regular', color = 'primary', style, ...rest }: Props) {
  return (
    <RNText
      style={[
        { fontFamily: fontFamily(weight), color: colorFor(color) },
        variantStyles[variant],
        style,
      ]}
      {...rest}
    />
  );
}

function fontFamily(w: Weight): string {
  switch (w) {
    case 'regular': return TYPOGRAPHY.fontFamilyRegular;
    case 'medium': return TYPOGRAPHY.fontFamilyMedium;
    case 'semiBold': return TYPOGRAPHY.fontFamilySemiBold;
    case 'bold': return TYPOGRAPHY.fontFamilyBold;
  }
}

function colorFor(c: Color): string {
  switch (c) {
    case 'primary': return COLORS.onSurface;
    case 'secondary': return COLORS.onSurfaceSecondary;
    case 'tertiary': return COLORS.onSurfaceTertiary;
    case 'gold': return COLORS.gold;
    case 'error': return COLORS.error;
    case 'success': return COLORS.success;
  }
}

const variantStyles = StyleSheet.create({
  display: { fontSize: TYPOGRAPHY['4xl'], lineHeight: 52 },
  h1: { fontSize: TYPOGRAPHY['3xl'], lineHeight: 40 },
  h2: { fontSize: TYPOGRAPHY['2xl'], lineHeight: 34 },
  h3: { fontSize: TYPOGRAPHY.xl, lineHeight: 28 },
  body: { fontSize: TYPOGRAPHY.base, lineHeight: 22 },
  caption: { fontSize: TYPOGRAPHY.sm, lineHeight: 18 },
  label: { fontSize: TYPOGRAPHY.xs, lineHeight: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
  price: { fontSize: TYPOGRAPHY.lg, lineHeight: 22, fontFamily: TYPOGRAPHY.fontFamilyBold },
});
