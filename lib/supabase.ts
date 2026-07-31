import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing env vars — auth will be disabled until EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.',
  );
}

// Memory storage is the universal fallback. It is always available and never
// throws at import time, so a missing/unsupported native module can never
// block app startup or leave the splash screen hanging.
const memoryStore = new Map<string, string>();
const memoryAdapter = {
  getItem: async (key: string) => memoryStore.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    memoryStore.set(key, value);
  },
  removeItem: async (key: string) => {
    memoryStore.delete(key);
  },
};

// Synchronous storage adapter for the web. localStorage is always available
// in a browser context; we guard against private-mode/quota errors.
const webAdapter = {
  getItem: async (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore quota / privacy mode errors */
    }
  },
  removeItem: async (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

// Pick the storage adapter at creation time. On web we use localStorage
// synchronously. On native we fall back to the in-memory adapter for the
// initial client (sessions still work for the current app run) and attempt
// to upgrade to SecureStore/AsyncStorage for persistence — but critically,
// the client is created synchronously so the app never blocks on import.
const storageAdapter = Platform.OS === 'web' ? webAdapter : memoryAdapter;

console.log("SUPABASE URL:", supabaseUrl);
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
  },
);

// On native, try to migrate the session into SecureStore/AsyncStorage for
// persistence across app restarts. This runs in the background and never
// blocks startup — if the native modules are missing the in-memory adapter
// is already in use.
if (Platform.OS !== 'web') {
  (async () => {
    try {
      const SecureStore = await import('expo-secure-store');
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        // Persist any existing session token to native storage so it survives
        // a restart. The in-memory adapter holds it for the current run.
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          try {
            await SecureStore.setItemAsync('mezbaan-auth', JSON.stringify(data.session));
          } catch {
            try {
              await AsyncStorage.default.setItem('mezbaan-auth', JSON.stringify(data.session));
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        /* AsyncStorage unavailable — SecureStore persistence only */
      }
    } catch {
      /* SecureStore unavailable — in-memory session is fine for this run */
    }
  })().catch(() => {
    /* persistence upgrade is best-effort, never fatal */
  });
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
