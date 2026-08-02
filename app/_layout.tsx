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
import { loadToken, useApp } from '@/src/store';
import { api } from '@/src/api';

// Prevent native splash from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useFrameworkReady();

  // Access user state setter for auto-login
  const { setUser } = useApp ? useApp() : { setUser: null };

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
      /* already hidden */
    }
  }, []);

  // 1. Auto-Login / Session Restore on App Launch
  useEffect(() => {
    (async () => {
      try {
        const token = await loadToken();
        if (token) {
          const userData = await api.me();
          if (userData && setUser) {
            setUser(userData);
          }
        }
      } catch (e) {
        console.log('[Auto-Login] Session restore failed:', e);
      }
    })();
  }, [setUser]);

  // 2. Hide splash as soon as fonts resolve
  useEffect(() => {
    if (fontsLoaded || fontError) {
      hideSplash();
    }
  }, [fontsLoaded, fontError, hideSplash]);

  // 3. Hard fallback timer for splash
  useEffect(() => {
    const t = setTimeout(hideSplash, 2500);
    return () => clearTimeout(t);
  }, [hideSplash]);

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

