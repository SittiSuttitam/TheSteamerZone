import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { UserConfigFile } from './userConfig.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SERVICE_ROLE = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
/** ใช้เฉพาะ JWT anon key — ห้ามใช้ publishable key แทน (auth จะล้มเหลว) */
const ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();

/** ข้อความล่าสุดเมื่อเชื่อม Supabase ไม่สำเร็จ (แสดงบนเว็บ) */
let lastAuthError: string | null = null;

export function getLastAuthError(): string | null {
  return lastAuthError;
}

export function hasServerBuildConfig(): boolean {
  return !!(SUPABASE_URL && (SERVICE_ROLE || ANON_KEY));
}

export function usesServiceRole(): boolean {
  return !!(SUPABASE_URL && SERVICE_ROLE);
}

export type SessionPersist = (tokens: {
  accessToken: string;
  refreshToken: string;
}) => void;

/** สร้าง client — service role หรือ session จากเว็บ */
export async function createConnectorSupabase(
  userConfig: UserConfigFile,
  onSessionUpdate?: SessionPersist
): Promise<SupabaseClient | null> {
  lastAuthError = null;

  if (!SUPABASE_URL) {
    lastAuthError = 'ไม่มี SUPABASE_URL ในโปรแกรม';
    return null;
  }

  if (SERVICE_ROLE) {
    return createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  const accessToken = userConfig.accessToken?.trim();
  const refreshToken = userConfig.refreshToken?.trim();

  if (!ANON_KEY) {
    lastAuthError = 'โปรแกรมไม่มี Supabase key — build ใหม่';
    return null;
  }
  if (!accessToken && !refreshToken) {
    lastAuthError = 'ยังไม่มี token — กด「เชื่อมต่อทั้งหมด」บนเว็บ';
    return null;
  }

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  });

  if (onSessionUpdate) {
    client.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token && session.refresh_token) {
        onSessionUpdate({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        });
      }
    });
  }

  // setSession จะใช้ refresh_token ต่ออายุ access อัตโนมัติถ้าหมดอายุ
  if (refreshToken || accessToken) {
    const { error } = await client.auth.setSession({
      access_token: accessToken || '',
      refresh_token: refreshToken || '',
    });
    if (error) {
      console.warn('[supabase] setSession:', error.message);
    }
  }

  let { data: sessionData, error: sessionErr } = await client.auth.getSession();
  let session = sessionData.session;

  if (!session?.access_token && refreshToken) {
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error) {
      console.warn('[supabase] refreshSession:', error.message);
      lastAuthError = error.message;
    }
    session = data.session ?? null;
  }

  if (!session?.access_token) {
    lastAuthError =
      lastAuthError ||
      sessionErr?.message ||
      'เซสชันหมดอายุ — ล็อกอินเว็บใหม่แล้วกดเชื่อมต่ออีกครั้ง';
    return null;
  }

  return client;
}
