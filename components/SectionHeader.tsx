import { View, Text as RNText, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, SPACING } from '@/lib/theme';

type Props = { title: string; actionLabel?: string; onAction?: () => void };

export function SectionHeader({ title, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <RNText style={styles.title}>{title}</RNText>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8} style={styles.action}>
          <RNText style={styles.actionText}>{actionLabel}</RNText>
          <ChevronRight size={14} color={COLORS.gold} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, marginBottom: SPACING.md, marginTop: SPACING.lg },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.onSurface, letterSpacing: 0.2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { fontSize: 13, color: COLORS.gold, fontWeight: '600' },
});
