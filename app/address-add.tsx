import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Home, Briefcase, MapPin } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/lib/theme';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { addAddress } from '@/lib/services';
import { useCart } from '@/lib/cart-context';
import type { AddressLabel } from '@/lib/types';
import { haptic } from '@/lib/utils';

export default function AddAddressScreen() {
  const router = useRouter();
  const { setSelectedAddress } = useCart();
  const [label, setLabel] = useState<AddressLabel>('home');
  const [fullAddress, setFullAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelOptions: { value: AddressLabel; icon: React.ReactNode; text: string }[] = [
    { value: 'home', icon: <Home size={16} color={COLORS.gold} />, text: 'Home' },
    { value: 'work', icon: <Briefcase size={16} color={COLORS.gold} />, text: 'Work' },
    { value: 'other', icon: <MapPin size={16} color={COLORS.gold} />, text: 'Other' },
  ];

  const handleSave = async () => {
    setError(null);
    if (!fullAddress.trim()) {
      setError('Please enter your full address.');
      return;
    }
    setSaving(true);
    try {
      const addr = await addAddress({
        label,
        full_address: fullAddress.trim(),
        landmark: landmark.trim() || undefined,
        is_default: isDefault,
      });
      haptic.success();
      setSelectedAddress(addr);
      router.back();
    } catch (e: any) {
    console.log("ADDRESS ERROR:", e);
    console.log("ADDRESS ERROR JSON:", JSON.stringify(e, null, 2));

     setError(e?.message || "Failed to save address.");

     console.warn("add addr", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color={COLORS.onSurface} />
          </Pressable>
          <Text variant="h2" weight="bold">Add Address</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {error && (
            <View style={styles.errorBox}>
              <Text variant="caption" color="error">{error}</Text>
            </View>
          )}

          {/* Label selector */}
          <Text variant="caption" color="secondary" weight="medium" style={styles.fieldLabel}>Save As</Text>
          <View style={styles.labelRow}>
            {labelOptions.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => { haptic.selection(); setLabel(opt.value); }}
                style={({ pressed }) => [styles.labelChip, label === opt.value && styles.labelActive, pressed && { transform: [{ scale: 0.96 }] }]}
              >
                {opt.icon}
                <Text weight="semiBold" color={label === opt.value ? 'gold' : 'secondary'}>{opt.text}</Text>
              </Pressable>
            ))}
          </View>

          {/* Full address */}
          <View style={styles.field}>
            <Text variant="caption" color="secondary" weight="medium" style={styles.fieldLabel}>Complete Address</Text>
            <TextInput
              value={fullAddress}
              onChangeText={setFullAddress}
              placeholder="House no, Building, Street, Area, City"
              placeholderTextColor={COLORS.onSurfaceTertiary}
              multiline
              style={[styles.input, styles.textArea]}
            />
          </View>

          {/* Landmark */}
          <View style={styles.field}>
            <Text variant="caption" color="secondary" weight="medium" style={styles.fieldLabel}>Landmark (optional)</Text>
            <TextInput
              value={landmark}
              onChangeText={setLandmark}
              placeholder="Near a shop, park, etc."
              placeholderTextColor={COLORS.onSurfaceTertiary}
              style={styles.input}
            />
          </View>

          {/* Default toggle */}
          <Pressable onPress={() => { haptic.selection(); setIsDefault((v) => !v); }} style={styles.defaultRow}>
            <View style={[styles.checkbox, isDefault && styles.checkboxActive]}>
              {isDefault && <Text color="gold" weight="bold">✓</Text>}
            </View>
            <Text weight="medium">Set as default address</Text>
          </Pressable>

          <View style={{ height: SPACING['2xl'] }} />
        </ScrollView>

        <View style={styles.ctaBar}>
          <Button label={saving ? 'Saving…' : 'Save Address'} onPress={handleSave} loading={saving} full size="lg" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.black },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING['2xl'] },
  errorBox: {
    backgroundColor: 'rgba(229,72,77,0.12)',
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  field: { marginBottom: SPACING.lg, gap: SPACING.xs },
  fieldLabel: { letterSpacing: 0.3 },
  labelRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  labelActive: { borderColor: COLORS.gold, backgroundColor: COLORS.goldMuted },
  input: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    color: COLORS.onSurface,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    fontSize: TYPOGRAPHY.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { borderColor: COLORS.gold, backgroundColor: COLORS.goldMuted },
  ctaBar: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: COLORS.glass, borderTopColor: COLORS.goldBorder, borderTopWidth: 1 },
});
