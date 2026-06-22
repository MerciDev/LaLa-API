import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    console.warn('[Supabase] SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Falling back to local files.');
    return null;
  }

  supabase = createClient(url, key);
  console.log('[Supabase] Client initialized with service_role key');
  return supabase;
}

export function isSupabaseConfigured(): boolean {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;
}
