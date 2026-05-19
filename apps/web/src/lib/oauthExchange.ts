import type { SupabaseClient } from '@supabase/supabase-js';

/** แลก PKCE ?code= เป็น session แล้วลบพารามิเตอร์ออกจาก URL */
export async function exchangeOAuthCodeIfPresent(
  sb: SupabaseClient
): Promise<{ exchanged: boolean; error: string | null }> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) {
    return { exchanged: false, error: null };
  }

  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    return { exchanged: false, error: error.message };
  }

  params.delete('code');
  params.delete('state');
  const qs = params.toString();
  const clean = window.location.pathname + (qs ? `?${qs}` : '');
  window.history.replaceState(null, '', clean);
  return { exchanged: true, error: null };
}
