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
import { Mail, Lock, Eye, EyeOff, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '@/lib/theme';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth-context';
import { haptic } from '@/lib/utils';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(email.trim(), password);
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

  const handleForgot = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email above to receive a reset link.');
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setForgotSent(true);
      haptic.success();
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
            <Text variant="h1" weight="bold" style={styles.title}>Welcome Back</Text>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              {forgotMode ? 'Reset your password' : 'Sign in to order your favourite meals'}
            </Text>
          </View>

          <View style={styles.form}>
            {error && (
              <View style={styles.errorBox}>
                <Text variant="caption" color="error">{error}</Text>
              </View>
            )}

            {forgotSent && (
              <View style={styles.successBox}>
                <Text variant="caption" color="success">Reset link sent! Check your email inbox.</Text>
              </View>
            )}

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

            {!forgotMode && (
              <Field label="Password">
                <View style={styles.inputWrap}>
                  <Lock size={18} color={COLORS.onSurfaceSecondary} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.onSurfaceTertiary}
                    secureTextEntry={!showPw}
                    style={styles.input}
                  />
                  <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                    {showPw ? <EyeOff size={16} color={COLORS.onSurfaceSecondary} /> : <Eye size={16} color={COLORS.onSurfaceSecondary} />}
                  </Pressable>
                </View>
              </Field>
            )}

            {!forgotMode && (
              <Pressable onPress={() => { setForgotMode(true); setForgotSent(false); setError(null); }} style={styles.forgotBtn}>
                <Text variant="caption" color="gold">Forgot password?</Text>
              </Pressable>
            )}

            {forgotMode ? (
              <>
                <Button label={loading ? 'Sending…' : 'Send Reset Link'} onPress={handleForgot} loading={loading} full size="lg" />
                <Pressable onPress={() => { setForgotMode(false); setForgotSent(false); setError(null); }} style={styles.backBtn}>
                  <ChevronLeft size={16} color={COLORS.onSurfaceSecondary} />
                  <Text variant="caption" color="secondary">Back to login</Text>
                </Pressable>
              </>
            ) : (
              <Button label={loading ? 'Signing in…' : 'Sign In'} onPress={handleLogin} loading={loading} full size="lg" />
            )}

            {!forgotMode && (
              <>
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

                <View style={styles.signupRow}>
                  <Text variant="caption" color="secondary">New to Mezbaan? </Text>
                  <Pressable onPress={() => router.push('/(auth)/signup')}>
                    <Text variant="caption" color="gold" weight="semiBold">Create account</Text>
                  </Pressable>
                </View>
              </>
            )}
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
    paddingTop: SPACING['3xl'] + SPACING.lg,
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
  successBox: {
    backgroundColor: 'rgba(48,164,108,0.12)',
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', paddingVertical: SPACING.sm },
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
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: SPACING.sm },
});
