import { View, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Wallet, MapPin, Bell, Heart, LogOut, ChevronRight, CreditCard,
  Phone, Mail, HelpCircle, User,
} from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '@/lib/theme';
import { Text } from '@/components/Text';
import { useAuth } from '@/lib/auth-context';
import { fetchWallet } from '@/lib/services';
import { useEffect, useState, useCallback } from 'react';
import type { Wallet as WalletType } from '@/lib/types';
import { formatCurrency, haptic } from '@/lib/utils';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);

  const loadWallet = useCallback(async () => {
    try {
      setWallet(await fetchWallet());
    } catch (e) {
      console.warn('wallet load', e);
    }
  }, []);

  useEffect(() => { loadWallet(); }, [loadWallet]);

const handleLogout = () => {
  console.log("Logout pressed");

  Alert.alert(
    "Sign Out",
    "Are you sure you want to sign out?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          console.log("Confirmed logout");
          haptic.light();
          await signOut();
        },
      },
    ]
  );
};

  const rows: { icon: React.ReactNode; label: string; onPress: () => void; value?: string }[] = [
    { icon: <Wallet size={20} color={COLORS.gold} />, label: 'Wallet', onPress: () => router.push('/wallet'), value: wallet ? formatCurrency(Number(wallet.balance)) : '₹0' },
    { icon: <MapPin size={20} color={COLORS.gold} />, label: 'My Addresses', onPress: () => router.push('/address-list') },
    { icon: <Heart size={20} color={COLORS.gold} />, label: 'Wishlist', onPress: () => router.push('/wishlist') },
    { icon: <Bell size={20} color={COLORS.gold} />, label: 'Notifications', onPress: () => router.push('/notifications') },
    { icon: <CreditCard size={20} color={COLORS.gold} />, label: 'Payment Methods', onPress: () => {} },
    { icon: <HelpCircle size={20} color={COLORS.gold} />, label: 'Help & Support', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            {profile?.avatar_url ? null : <User size={32} color={COLORS.gold} />}
          </View>
          <View style={styles.profileInfo}>
            <Text variant="h2" weight="bold">{profile?.full_name || 'Mezbaan Customer'}</Text>
            <Text variant="caption" color="secondary">{user?.email}</Text>
            {profile?.phone && <Text variant="caption" color="secondary">{profile.phone}</Text>}
          </View>
        </View>

        {/* Wallet quick card */}
        <Pressable onPress={() => router.push('/wallet')} style={({ pressed }) => [styles.walletCard, pressed && { transform: [{ scale: 0.98 }] }]}>
          <View style={styles.walletLeft}>
            <Wallet size={24} color={COLORS.gold} />
            <View>
              <Text variant="caption" color="secondary">Wallet Balance</Text>
              <Text variant="h2" weight="bold" color="gold">{wallet ? formatCurrency(Number(wallet.balance)) : '₹0'}</Text>
            </View>
          </View>
          <ChevronRight size={20} color={COLORS.gold} />
        </Pressable>

        {/* Settings rows */}
        <View style={styles.rowsSection}>
          {rows.map((row, idx) => (
            <Pressable
              key={idx}
              onPress={() => { haptic.selection(); row.onPress(); }}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.rowIcon}>{row.icon}</View>
              <Text weight="medium" style={styles.rowLabel}>{row.label}</Text>
              {row.value && <Text variant="caption" color="gold" weight="semiBold">{row.value}</Text>}
              <ChevronRight size={16} color={COLORS.onSurfaceTertiary} />
            </Pressable>
          ))}
        </View>

        {/* Contact info */}
        <View style={styles.contactSection}>
          <Text variant="label" color="tertiary" weight="semiBold" style={styles.contactTitle}>RESTAURANT</Text>
          <View style={styles.contactRow}>
            <Phone size={16} color={COLORS.onSurfaceSecondary} />
            <Text variant="caption" color="secondary">+91 859 524 4548</Text>
          </View>
          <View style={styles.contactRow}>
            <Mail size={16} color={COLORS.onSurfaceSecondary} />
            <Text variant="caption" color="secondary">contact@mezbaaan.in</Text>
          </View>
        </View>

        {/* Logout */}
        <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}>
          <LogOut size={20} color={COLORS.error} />
          <Text weight="semiBold" color="error">Sign Out</Text>
        </Pressable>

        <Text variant="caption" color="tertiary" style={styles.version}>Mezbaan Restro v1.0.0</Text>
        <View style={{ height: SPACING['2xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg, marginBottom: SPACING.xl },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.goldBorder,
  },
  profileInfo: { flex: 1, gap: 2 },
  walletCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    marginBottom: SPACING.lg,
  },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  rowsSection: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.goldMuted, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1 },
  contactSection: { marginBottom: SPACING.lg, gap: SPACING.sm, paddingHorizontal: SPACING.sm },
  contactTitle: { marginBottom: SPACING.xs },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md + 2,
    backgroundColor: 'rgba(229,72,77,0.1)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.3)',
    marginBottom: SPACING.lg,
  },
  version: { textAlign: 'center' },
});
