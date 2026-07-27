import { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff, User, Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/lib/theme';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth-context';
import { haptic } from '@/lib/utils';

export default function SignupScreen() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    setError(null);
    if (!fullName.trim() || !phone.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await signUpWithEmail(email.trim(), password, fullName.trim(), phone.trim());
    setLoading(false);
    if (error) {
      setError(error);
      haptic.error();
    } else {
      haptic.success();
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      setError(error);
      haptic.error();
    }
  };

  return (
    <LinearGradient colors={[COLORS.black, COLORS.surface]} style={styles.bg}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text variant="label" color="gold" weight="semiBold" style={styles.brand}>MEZBAAN RESTRO</Text>
            <Text variant="h1" weight="bold" style={styles.title}>Create Account</Text>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              Join Mezbaan for premium food delivered to your door.
            </Text>
          </View>

          <View style={styles.form}>
            {error && (
              <View style={styles.errorBox}>
                <Text variant="caption" color="error">{error}</Text>
              </View>
            )}

            <Field label="Full Name">
              <View style={styles.inputWrap}>
                <User size={18} color={COLORS.onSurfaceSecondary} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your name"
                  placeholderTextColor={COLORS.onSurfaceTertiary}
                  style={styles.input}
                />
              </View>
            </Field>

            <Field label="Phone">
              <View style={styles.inputWrap}>
                <Phone size={18} color={COLORS.onSurfaceSecondary} />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={COLORS.onSurfaceTertiary}
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>
            </Field>

            <Field label="Email">
              <View style={styles.inputWrap}>
                <Mail size={18} color={COLORS.onSurfaceSecondary} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.onSurfaceTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
            </Field>

            <Field label="Password">
              <View style={styles.inputWrap}>
                <Lock size={18} color={COLORS.onSurfaceSecondary} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={COLORS.onSurfaceTertiary}
                  secureTextEntry={!showPw}
                  style={styles.input}
                />
                <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                  {showPw ? <EyeOff size={16} color={COLORS.onSurfaceSecondary} /> : <Eye size={16} color={COLORS.onSurfaceSecondary} />}
                </Pressable>
              </View>
            </Field>

            <Button label={loading ? 'Creating account…' : 'Sign Up'} onPress={handleSignup} loading={loading} full size="lg" />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text variant="caption" color="tertiary">or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              onPress={handleGoogle}
              disabled={googleLoading}
              style={({ pressed }) => [styles.googleBtn, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <View style={styles.googleIcon}>
                <Text weight="bold" style={styles.googleG}>G</Text>
              </View>
              <Text weight="semiBold" style={styles.googleText}>Continue with Google</Text>
            </Pressable>

            <View style={styles.loginRow}>
              <Text variant="caption" color="secondary">Already have an account? </Text>
              <Pressable onPress={() => router.push('/(auth)/login')}>
                <Text variant="caption" color="gold" weight="semiBold">Sign in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="caption" color="secondary" weight="medium" style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING['2xl'] + SPACING.lg,
    paddingBottom: SPACING['2xl'],
  },
  hero: { marginBottom: SPACING.xl },
  brand: { letterSpacing: 3, marginBottom: SPACING.sm },
  title: { marginBottom: SPACING.xs },
  subtitle: { lineHeight: 22 },
  form: { gap: SPACING.md },
  field: { gap: SPACING.xs },
  fieldLabel: { letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    color: COLORS.onSurface,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    fontSize: TYPOGRAPHY.base,
    paddingVertical: 0,
  },
  errorBox: {
    backgroundColor: 'rgba(229,72,77,0.12)',
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginVertical: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: { color: '#4285F4', fontSize: 14 },
  googleText: { color: COLORS.onSurface },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: SPACING.sm },
});
