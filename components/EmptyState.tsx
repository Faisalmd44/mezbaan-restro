import { View, StyleSheet, Pressable } from 'react-native';
import { ReactNode } from 'react';
import { COLORS, SPACING } from '@/lib/theme';
import { Text } from './Text';
import { Button } from './Button';

type Props = { icon?: ReactNode; title: string; subtitle?: string; actionLabel?: string; onAction?: () => void };

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text variant="h3" weight="semiBold" style={styles.title}>{title}</Text>
      {subtitle && <Text variant="body" color="secondary" style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} variant="outline" style={styles.action} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING['2xl'], gap: SPACING.md },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.surfaceTertiary, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', paddingHorizontal: SPACING.xl },
  action: { marginTop: SPACING.md },
});
