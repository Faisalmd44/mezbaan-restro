import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import type { Profile } from './types';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const settledRef = useRef(false);

  const settle = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    setLoading(false);
  }, []);

  const loadProfile = useCallback(async (uid: string) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      setProfile(data as Profile | null);
    } catch {
      // profile load failure is non-fatal
    }
  }, []);

  useEffect(() => {
    const hardTimeout = setTimeout(() => {
      console.warn('[Auth] hard timeout hit — proceeding without session');
      settle();
    }, 3500);

    if (!isSupabaseConfigured) {
      clearTimeout(hardTimeout);
      settle();
      return;
    }

    let settled = false;
    const settleOnce = () => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimeout);
      settle();
    };

    const safeLoadProfile = (uid: string) =>
      Promise.race([
        loadProfile(uid).catch(() => {}),
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ]).finally(settleOnce);

    let subscription: { unsubscribe: () => void } | undefined;
    try {
      ({ data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          safeLoadProfile(newSession.user.id);
        } else {
          settleOnce();
        }
      }));
    } catch {
      // onAuthStateChange threw synchronously — rely on getSession fallback.
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (settled) return;
        setSession(data.session);
        if (data.session?.user) {
          safeLoadProfile(data.session.user.id);
        } else {
          settleOnce();
        }
      })
      .catch(() => settleOnce());

    return () => {
      subscription?.unsubscribe();
      clearTimeout(hardTimeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase not configured — set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.' };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Sign in failed' };
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName: string, phone: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase not configured.' };
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone } },
      });
      if (error) return { error: error.message };
      if (data.user) await loadProfile(data.user.id);
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Sign up failed' };
    }
  }, [loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) return { error: 'Supabase not configured.' };
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Google sign in failed' };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase not configured.' };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Reset failed' };
    }
  }, []);

  const signOut = useCallback(async () => {
    try { if (isSupabaseConfigured) await supabase.auth.signOut(); } catch { /* ignore */ }
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, profile, loading,
      signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
