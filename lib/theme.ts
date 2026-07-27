import { StyleSheet } from 'react-native';

export const COLORS = {
  black: '#0A0A0B',
  surface: '#121214',
  surfaceSecondary: '#1A1A1F',
  surfaceTertiary: '#232329',
  surfaceInverse: '#FFFFFF',
  onSurface: '#FFFFFF',
  onSurfaceSecondary: '#A1A1AA',
  onSurfaceTertiary: '#71717A',
  gold: '#E0B252',
  goldBright: '#F4C430',
  goldDeep: '#B8943A',
  goldMuted: 'rgba(224, 178, 82, 0.15)',
  onGold: '#0A0A0B',
  red: '#E5484D',
  redDeep: '#B71C1C',
  green: '#30A46C',
  greenDeep: '#2E7D32',
  success: '#30A46C',
  warning: '#F5A623',
  error: '#E5484D',
  info: '#0288D1',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  divider: 'rgba(255,255,255,0.06)',
  goldBorder: 'rgba(224, 178, 82, 0.35)',
  glass: 'rgba(18, 18, 20, 0.72)',
  glassLight: 'rgba(255,255,255,0.06)',
  scrim: 'rgba(0,0,0,0.55)',
} as const;

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, '3xl': 48, '4xl': 64 } as const;
export const RADIUS = { sm: 8, md: 12, lg: 20, xl: 28, pill: 999 } as const;
export const TYPOGRAPHY = {
  fontFamilyRegular: 'PlusJakartaSans-Regular',
  fontFamilyMedium: 'PlusJakartaSans-Medium',
  fontFamilySemiBold: 'PlusJakartaSans-SemiBold',
  fontFamilyBold: 'PlusJakartaSans-Bold',
  xs: 11, sm: 13, base: 15, lg: 17, xl: 22, '2xl': 28, '3xl': 36, '4xl': 48,
} as const;
export const SHADOWS = {
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  gold: { shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  floating: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 20, elevation: 12 },
} as const;
export const ANIMATION = { fast: 180, normal: 280, slow: 420 } as const;

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
});
