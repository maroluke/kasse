import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabaseEnv = !!(url && anon);

export const supabase = hasSupabaseEnv
  ? createClient(url!, anon!, { auth: { persistSession: true } })
  : (null as any);
