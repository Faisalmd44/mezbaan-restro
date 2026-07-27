import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing env vars — auth will be disabled until EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.');
}

// SecureStore is only available on native; AsyncStorage works everywhere.
// On native we prefer SecureStore (encrypted) with AsyncStorage fallback.
const storageAdapter = Platform.OS === 'web'
  ? {
      getItem: async (key: string) => {
        try { return localStorage.getItem(key); } catch { return null; }
      },
      setItem: async (key: string, value: string) => {
        try { localStorage.setItem(key, value); } catch { /* ignore */ }
      },
      removeItem: async (key: string) => {
        try { localStorage.removeItem(key); } catch { /* ignore */ }
      },
    }
  : {
      getItem: async (key: string) => {
        try {
          const v = await SecureStore.getItemAsync(key);
          if (v != null) return v;
        } catch { /* SecureStore may fail on emulator */ }
        try { return await AsyncStorage.getItem(key); } catch { return null; }
      },
      setItem: async (key: string, value: string) => {
        try { await SecureStore.setItemAsync(key, value); return; } catch { /* fall through */ }
        try { await AsyncStorage.setItem(key, value); } catch { /* ignore */ }
      },
      removeItem: async (key: string) => {
        try { await SecureStore.deleteItemAsync(key); } catch { /* fall through */ }
        try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
      },
    };

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: storageAdapter,
      storageKey: 'mezbaan-auth',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  }
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
