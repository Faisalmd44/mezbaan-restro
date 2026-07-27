import { View, Text as RNText, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/lib/theme';

type Props = { label: string; value: string; bold?: boolean; color?: string };

export function PriceRow({ label, value, bold, color }: Props) {
  return (
    <View style={styles.row}>
      <RNText style={[styles.label, bold && { fontFamily: TYPOGRAPHY.fontFamilySemiBold, color: COLORS.onSurface }]}>{label}</RNText>
      <RNText style={[styles.value, bold && { fontFamily: TYPOGRAPHY.fontFamilyBold, fontSize: TYPOGRAPHY.lg }, { color: color ?? COLORS.onSurface }]}>{value}</RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  label: { fontFamily: TYPOGRAPHY.fontFamilyRegular, fontSize: TYPOGRAPHY.base, color: COLORS.onSurfaceSecondary },
  value: { fontFamily: TYPOGRAPHY.fontFamilyMedium, fontSize: TYPOGRAPHY.base, color: COLORS.onSurface },
});
