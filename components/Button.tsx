import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/lib/theme';
import { haptic } from '@/lib/utils';

type Variant = 'primary' | 'gold' | 'outline' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label, onPress, loading, disabled, variant = 'primary', size = 'md', full, style,
}: Props) {
  const handlePress = () => {
    if (disabled || loading) return;
    haptic.light();
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base, size === 'lg' && styles.lg, styles[variant], full && styles.full,
        (disabled || loading) && styles.disabled, pressed && styles.pressed, style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'gold' ? COLORS.onGold : COLORS.onSurface} size="small" />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.pill, paddingVertical: SPACING.md + 2, paddingHorizontal: SPACING.xl, minHeight: 48 },
  lg: { paddingVertical: SPACING.lg, minHeight: 56 },
  full: { width: '100%' },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  disabled: { opacity: 0.4 },
  primary: { backgroundColor: COLORS.gold },
  gold: { backgroundColor: COLORS.goldBright },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.gold },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: COLORS.error },
  text: { fontFamily: TYPOGRAPHY.fontFamilySemiBold, fontSize: TYPOGRAPHY.base, letterSpacing: 0.2 },
  primaryText: { color: COLORS.onGold },
  goldText: { color: COLORS.onGold },
  outlineText: { color: COLORS.gold },
  ghostText: { color: COLORS.onSurface },
  dangerText: { color: COLORS.onSurface },
});
