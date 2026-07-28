import { useEffect } from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/lib/auth-context';
import { COLORS } from '@/lib/theme';
import { Text } from '@/components/Text';

export default function IndexScreen() {
  const { session, loading } = useAuth();
  const router = useRouter();

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

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/splash-image.png')}
        style={styles.logo}
        resizeMode="contain"
        fadeDuration={0}
      />
      <Text variant="label" color="gold" weight="semiBold" style={styles.brand}>
        MEZBAAN
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
