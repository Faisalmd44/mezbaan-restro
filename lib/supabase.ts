import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
}

const storageAdapter = Platform.OS === 'web'
  ? {
      getItem: async (key: string) => { const v = localStorage.getItem(key); return v ?? null; },
      setItem: async (key: string, value: string) => { localStorage.setItem(key, value); },
      removeItem: async (key: string) => { localStorage.removeItem(key); },
    }
  : {
      getItem: async (key: string) => {
        try { const v = await SecureStore.getItemAsync(key); return v ?? null; }
        catch { return (await AsyncStorage.getItem(key)) ?? null; }
      },
      setItem: async (key: string, value: string) => {
        try { await SecureStore.setItemAsync(key, value); }
        catch { await AsyncStorage.setItem(key, value); }
      },
      removeItem: async (key: string) => {
        try { await SecureStore.deleteItemAsync(key); }
        catch { await AsyncStorage.removeItem(key); }
      },
    };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
