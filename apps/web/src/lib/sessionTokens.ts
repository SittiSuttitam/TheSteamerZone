import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

/** ดึง access/refresh token ล่าสุดก่อนส่งให้ Connector */
export async function getFreshSessionTokens(
  fallback?: Session | null
): Promise<{ accessToken?: string; refreshToken?: string }> {
  const s = getSupabase();
  if (!s) {
    return {
      accessToken: fallback?.access_token,
      refreshToken: fallback?.refresh_token,
    };
  }

  const { data: current } = await s.auth.getSession();
  if (current.session?.access_token) {
    return {
      accessToken: current.session.access_token,
      refreshToken: current.session.refresh_token,
    };
  }

  if (fallback?.refresh_token) {
    const { data, error } = await s.auth.refreshSession({
      refresh_token: fallback.refresh_token,
    });
    if (!error && data.session?.access_token) {
      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    }
  }

  return {
    accessToken: fallback?.access_token,
    refreshToken: fallback?.refresh_token,
  };
}
