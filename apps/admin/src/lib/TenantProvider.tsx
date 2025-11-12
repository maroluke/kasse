import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { hasSupabaseEnv, supabase } from './supabaseClient';
import { useAuth } from './AuthProvider';

interface TenantContextValue {
  tenantId: string | null;
  setTenantId: (id: string) => void;
  supa: any | null;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

  useEffect(() => {
    async function fetchTenant() {
      if (!hasSupabaseEnv) { setTenantId(null); return; }
      if (!user) {
        const fallback = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || (typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : '');
        setTenantId(fallback);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Use authenticated client so auth.uid() RLS can allow access
        const { data, error } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id);
        if (error) throw error;
        let first = (data && data[0]?.tenant_id) || null;
        if (!first) {
          const fallback = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || (typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : '');
          first = fallback;
        }
        setTenantId(first);
        if (first && typeof window !== 'undefined') localStorage.setItem('tenant_id', first);
      } catch (e: any) {
        setError(e.message || String(e));
        // On error (e.g., RLS), still try to apply fallback so UI keeps working
        const fallback = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || (typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : '');
        setTenantId(fallback);
      } finally {
        setLoading(false);
      }
    }
    fetchTenant();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hasSupabaseEnv]);

  const supa = useMemo(() => {
    if (!hasSupabaseEnv) return null;
    if (tenantId) {
      // Create tenant-scoped client to include x-tenant-id for RLS policies
      return createClient(url!, anon!, {
        auth: { persistSession: true },
        global: { headers: { 'x-tenant-id': tenantId } },
      });
    }
    return supabase;
  }, [hasSupabaseEnv, tenantId]);

  const value: TenantContextValue = { tenantId, setTenantId, supa, loading, error };
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
