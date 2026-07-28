import { useEffect } from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/lib/auth-context';
import { COLORS } from '@/lib/theme';
import { Text } from '@/components/Text';

/**
 * Entry point — shown at "/" while auth state is resolving.
 * Redirects to login or home once loading is false.
 */
export default function IndexScreen() {
  const { session, loading } = useAuth();
  const router = useRouter();

  // Extra safety net: hide the native splash the moment this screen mounts,
  // regardless of auth state. The root layout already hides it on font load,
  // but this guarantees it is hidden even if that path was skipped.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/login');
    }
  }, [loading, session]);

  // Show branded loading screen while we wait
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/splash.png')}
        style={styles.logo}
        resizeMode="contain"
        fadeDuration={0}
      />
      <Text variant="label" color="gold" weight="semiBold" style={styles.brand}>
        MEZBAAN RESTRO
      </Text>
      <ActivityIndicator size="small" color={COLORS.gold} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logo: {
    // ~45% of a typical 390pt mobile width, centered.
    width: 175,
    height: 175,
  },
  brand: {
    letterSpacing: 4,
    fontSize: 13,
  },
  spinner: {
    marginTop: 8,
  },
});
