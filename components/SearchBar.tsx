import { TextInput, View, StyleSheet, Pressable } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/lib/theme';

type Props = { value: string; onChangeText: (t: string) => void; placeholder?: string; onSubmit?: () => void };

export function SearchBar({ value, onChangeText, placeholder = 'Search dishes', onSubmit }: Props) {
  return (
    <View style={styles.wrap}>
      <Search size={18} color={COLORS.onSurfaceSecondary} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={COLORS.onSurfaceTertiary} onSubmitEditing={onSubmit} returnKeyType="search" style={styles.input} />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <X size={16} color={COLORS.onSurfaceSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  input: { flex: 1, color: COLORS.onSurface, fontFamily: TYPOGRAPHY.fontFamilyRegular, fontSize: TYPOGRAPHY.base, paddingVertical: 0 },
});
