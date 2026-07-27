import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
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

const AUTH_TIMEOUT = 4000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (error) {
        console.warn('loadProfile error', error.message);
        return;
      }
      setProfile(data as Profile | null);
    } catch (e) {
      console.warn('loadProfile exception', e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let settled = false;

    const settle = () => {
      if (settled || !mounted) return;
      settled = true;
      setLoading(false);
    };

    if (!isSupabaseConfigured) {
      settle();
      return;
    }

    const timeout = setTimeout(() => {
      console.warn('Auth getSession timed out after ' + AUTH_TIMEOUT + 'ms — proceeding without session');
      settle();
    }, AUTH_TIMEOUT);

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        clearTimeout(timeout);
        setSession(data.session);
        if (data.session?.user) {
          loadProfile(data.session.user.id).finally(() => settle());
        } else {
          settle();
        }
      })
      .catch((err) => {
        console.warn('getSession error', err);
        clearTimeout(timeout);
        settle();
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured. Check your .env file.' };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? error.message : null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Sign in failed' };
    }
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName: string, phone: string) => {
      if (!isSupabaseConfigured) return { error: 'Supabase is not configured. Check your .env file.' };
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, phone } },
        });
        if (error) return { error: error.message };
        if (data.user) {
          await loadProfile(data.user.id);
        }
        return { error: null };
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Sign up failed' };
      }
    },
    [loadProfile]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured. Check your .env file.' };
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      return { error: error ? error.message : null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Google sign in failed' };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured. Check your .env file.' };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error: error ? error.message : null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Password reset failed' };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      try { await supabase.auth.signOut(); } catch (e) { console.warn('signOut error', e); }
    }
    setProfile(null);
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resetPassword,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
