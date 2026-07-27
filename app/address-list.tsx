import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, MapPin, Plus, Trash2, CheckCircle2 } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '@/lib/theme';
import { Text } from '@/components/Text';
import { EmptyState } from '@/components/EmptyState';
import { fetchAddresses, deleteAddress } from '@/lib/services';
import type { Address } from '@/lib/types';
import { haptic } from '@/lib/utils';

export default function AddressListScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const a = await fetchAddresses();
      setAddresses(a);
    } catch (e) {
      console.warn('address list', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const handleDelete = (addr: Address) => {
    Alert.alert('Delete Address', 'Remove this saved address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAddress(addr.id);
            haptic.light();
            load();
          } catch (e) {
            console.warn('delete addr', e);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={COLORS.onSurface} />
        </Pressable>
        <Text variant="h2" weight="bold">My Addresses</Text>
        <View style={{ width: 40 }} />
      </View>

      {!loading && addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin size={32} color={COLORS.gold} />}
          title="No saved addresses"
          subtitle="Add a delivery address to speed up checkout."
          actionLabel="Add Address"
          onAction={() => router.push('/address-add')}
        />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
          renderItem={({ item }) => (
            <View style={styles.addrCard}>
              <View style={styles.addrIcon}>
                <MapPin size={18} color={COLORS.gold} />
              </View>
              <View style={styles.addrBody}>
                <View style={styles.addrLabelRow}>
                  <Text variant="caption" color="gold" weight="semiBold" style={styles.addrTag}>{item.label.toUpperCase()}</Text>
                  {item.is_default && (
                    <View style={styles.defaultBadge}>
                      <CheckCircle2 size={11} color={COLORS.success} />
                      <Text variant="caption" color="success" weight="semiBold">Default</Text>
                    </View>
                  )}
                </View>
                <Text weight="medium">{item.full_address}</Text>
                {item.landmark && <Text variant="caption" color="secondary">Near {item.landmark}</Text>}
              </View>
              <Pressable onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                <Trash2 size={16} color={COLORS.error} />
              </Pressable>
            </View>
          )}
        />
      )}

      {addresses.length > 0 && (
        <Pressable onPress={() => router.push('/address-add')} style={({ pressed }) => [styles.addBtn, pressed && { transform: [{ scale: 0.98 }] }]}>
          <Plus size={20} color={COLORS.gold} />
          <Text color="gold" weight="semiBold">Add New Address</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING['4xl'] },
  addrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  addrIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.goldMuted, alignItems: 'center', justifyContent: 'center' },
  addrBody: { flex: 1, gap: 2 },
  addrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  addrTag: { letterSpacing: 0.5 },
  defaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  deleteBtn: { padding: SPACING.sm },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.goldBorder,
    borderStyle: 'dashed',
  },
});
