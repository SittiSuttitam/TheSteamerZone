import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function supabasePublicKey(): string | undefined {
  const env = import.meta.env;
  return (
    (env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (env.VITE_SUPABASE_ANON_KEY as string | undefined)
  );
}

export function getSupabase(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = supabasePublicKey();
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
