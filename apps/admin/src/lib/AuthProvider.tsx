import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, hasSupabaseEnv } from './supabaseClient';

interface AuthContextValue {
  user: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }: { data: { session: any | null } }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: any | null) => {
      setUser(session?.user ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async signIn(email: string, password: string) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    async signOut() {
      await supabase.auth.signOut();
      try { if (typeof window !== 'undefined') localStorage.removeItem('tenant_id'); } catch {}
      if (typeof window !== 'undefined') window.location.href = '/login';
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
