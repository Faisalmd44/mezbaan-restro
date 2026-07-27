import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Wallet, ArrowDownCircle, ArrowUpCircle, Plus } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '@/lib/theme';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { fetchWallet, fetchWalletTransactions } from '@/lib/services';
import type { Wallet as WalletType, WalletTransaction } from '@/lib/types';
import { formatCurrency, formatDateTime, haptic } from '@/lib/utils';

export default function WalletScreen() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [w, tx] = await Promise.all([
        fetchWallet(),
        fetchWalletTransactions(),
      ]);
      setWallet(w);
      setTransactions(tx);
    } catch (e) {
      console.warn('wallet load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.onSurface} />
        </Pressable>
        <Text variant="h2" weight="bold">My Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <Wallet size={24} color={COLORS.gold} />
            <Text variant="caption" color="secondary">Available Balance</Text>
          </View>
          <Text variant="h1" weight="bold" color="gold" style={styles.balanceAmount}>
            {wallet ? formatCurrency(Number(wallet.balance)) : '₹0'}
          </Text>
          <Button label="Add Money" onPress={() => haptic.light()} variant="outline" size="md" style={styles.addBtn} />
        </View>

        {/* Transactions */}
        <Text variant="h3" weight="semiBold" style={styles.sectionTitle}>Transaction History</Text>

        {transactions.length === 0 ? (
          <EmptyState
            icon={<Wallet size={32} color={COLORS.gold} />}
            title="No transactions yet"
            subtitle="Your wallet activity will appear here."
          />
        ) : (
          <View style={styles.txList}>
            {transactions.map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <View style={[styles.txIcon, tx.type === 'credit' ? styles.txCredit : styles.txDebit]}>
                  {tx.type === 'credit' ? <ArrowDownCircle size={18} color={COLORS.success} /> : <ArrowUpCircle size={18} color={COLORS.error} />}
                </View>
                <View style={styles.txBody}>
                  <Text weight="semiBold">{tx.reason || (tx.type === 'credit' ? 'Money Added' : 'Payment')}</Text>
                  <Text variant="caption" color="tertiary">{formatDateTime(tx.created_at)}</Text>
                </View>
                <Text weight="bold" color={tx.type === 'credit' ? 'success' : 'error'}>
                  {tx.type === 'credit' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: SPACING['2xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING['4xl'] },
  balanceCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  balanceTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  balanceAmount: { fontSize: 36 },
  addBtn: { alignSelf: 'flex-start' },
  sectionTitle: { marginBottom: SPACING.md },
  txList: { gap: SPACING.sm },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txCredit: { backgroundColor: 'rgba(48,164,108,0.12)' },
  txDebit: { backgroundColor: 'rgba(229,72,77,0.12)' },
  txBody: { flex: 1, gap: 2 },
});
