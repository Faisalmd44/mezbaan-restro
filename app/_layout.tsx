import { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
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
import { AuthProvider } from '@/lib/auth-context';
import { CartProvider } from '@/lib/cart-context';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
  });

  const hideSplash = useCallback(async () => {
    try { await SplashScreen.hideAsync(); } catch { /* already hidden or not shown */ }
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the native splash as soon as fonts are ready.
      // Navigation (login vs home) is handled by app/index.tsx.
      hideSplash();
    }
  }, [fontsLoaded, fontError, hideSplash]);

  // Render the navigator unconditionally so Expo Router can mount routes.
  // The initial route "/" renders app/index.tsx which shows a loading screen
  // and redirects once auth state is known.
  return (
    <AuthProvider>
      <CartProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
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
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="light" />
      </CartProvider>
    </AuthProvider>
  );
}
