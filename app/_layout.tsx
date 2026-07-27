import { useEffect, useState, useCallback } from 'react';
import { Image, View, StyleSheet, ActivityIndicator, InteractionManager } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { CartProvider } from '@/lib/cart-context';
import { COLORS } from '@/lib/theme';
import { Text } from '@/components/Text';

SplashScreen.preventAutoHideAsync();

function LogoScreen() {
  return (
    <View style={styles.logoScreen}>
      <Image
        source={require('../assets/images/icon.png')}
        style={styles.logo}
        resizeMode="contain"
        fadeDuration={0}
      />
      <Text variant="label" color="gold" weight="semiBold" style={styles.logoText}>MEZBAAN RESTRO</Text>
      <ActivityIndicator size="small" color={COLORS.gold} style={styles.spinner} />
    </View>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const inAuthGroup = segments[0] === '(auth)';

  useEffect(() => {
    if (loading) return;
    const redirect = () => {
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (session && inAuthGroup) {
        router.replace('/(tabs)/home');
      }
    };
    const handle = InteractionManager.runAfterInteractions(redirect);
    return () => handle.cancel();
  }, [session, loading, inAuthGroup, router]);

  if (loading) return <LogoScreen />;

  return <>{children}</>;
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
  });

  const hideSplash = useCallback(async () => {
    try { await SplashScreen.hideAsync(); } catch { /* already hidden */ }
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      hideSplash();
    }
  }, [fontsLoaded, fontError, hideSplash]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <CartProvider>
        <Gate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="product/[id]" />
            <Stack.Screen name="checkout" />
            <Stack.Screen name="offers" />
            <Stack.Screen name="wishlist" />
            <Stack.Screen name="tracking/[id]" />
            <Stack.Screen name="address-list" />
            <Stack.Screen name="address-add" />
            <Stack.Screen name="wallet" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </Gate>
        <StatusBar style="light" />
      </CartProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  logoScreen: {
    flex: 1,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 22,
  },
  logoText: {
    letterSpacing: 4,
    fontSize: 14,
  },
  spinner: {
    marginTop: 8,
  },
});
