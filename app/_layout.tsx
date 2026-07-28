import { useEffect, useCallback, useRef } from 'react';
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

// Prevent the native splash from auto-hiding so we can hide it explicitly
// once fonts + first paint are ready. The .catch() guards against the case
// where the splash is already prevented (e.g. Fast Refresh).
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
  });

  const splashHiddenRef = useRef(false);
  const hideSplash = useCallback(() => {
    if (splashHiddenRef.current) return;
    splashHiddenRef.current = true;
    try {
      SplashScreen.hideAsync().catch(() => {});
    } catch {
      /* already hidden or not shown */
    }
  }, []);

  // Hide as soon as fonts resolve (success OR error). If font loading never
  // settles at all, the fallback timer below hides it anyway — the splash
  // must never hang the app.
  useEffect(() => {
    if (fontsLoaded || fontError) {
      hideSplash();
    }
  }, [fontsLoaded, fontError, hideSplash]);

  // Hard fallback: if the font hook never resolves (e.g. a font asset fails
  // to download), force the splash to hide after 2.5s regardless.
  useEffect(() => {
    const t = setTimeout(hideSplash, 2500);
    return () => clearTimeout(t);
  }, [hideSplash]);

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
