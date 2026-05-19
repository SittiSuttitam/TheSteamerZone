import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { UserConfigFile } from './userConfig.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();

function cleanKey(v: string | undefined): string {
  return (v || '').trim().replace(/^['"]|['"]$/g, '');
}

/** คีย์ backend — sb_secret_… หรือ legacy service_role JWT (eyJ…) */
function resolveServerKey(): string {
  for (const k of [
    cleanKey(process.env.SUPABASE_SECRET_KEY),
    cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY),
  ]) {
    if (!k || k.startsWith('sb_publishable_')) continue;
    if (k.startsWith('sb_secret_') || k.startsWith('eyJ')) return k;
  }
  return '';
}

/** คีย์สำหรับ session จากเว็บ — anon JWT หรือ publishable */
function resolveAnonKey(): string {
  for (const k of [
    cleanKey(process.env.SUPABASE_ANON_KEY),
    cleanKey(process.env.SUPABASE_PUBLISHABLE_KEY),
  ]) {
    if (!k || k.startsWith('sb_secret_')) continue;
    if (k.startsWith('eyJ') || k.startsWith('sb_publishable_')) return k;
  }
  return '';
}

const SERVER_KEY = resolveServerKey();
const ANON_KEY = resolveAnonKey();

/** ข้อความล่าสุดเมื่อเชื่อม Supabase ไม่สำเร็จ (แสดงบนเว็บ) */
let lastAuthError: string | null = null;

export function getLastAuthError(): string | null {
  return lastAuthError;
}

export function hasServerBuildConfig(): boolean {
  return !!(SUPABASE_URL && SERVER_KEY);
}

/** มีคีย์ backend สำหรับ pair / ซิงก์ OBS (ไม่ต้องล็อกอินเว็บ) */
export function usesServiceRole(): boolean {
  return !!SERVER_KEY;
}

export type SessionPersist = (tokens: {
  accessToken: string;
  refreshToken: string;
}) => void;

export function missingServerKeyMessage(): string {
  return (
    'โปรแกรมยังไม่มี Secret key — ใน apps/connector/.env ใส่ SUPABASE_SECRET_KEY ' +
    '(sb_secret_…) จาก Supabase → Settings → API Keys แล้ว build โปรแกรมใหม่'
  );
}

/** สร้าง client — secret/service key หรือ session จากเว็บ */
export async function createConnectorSupabase(
  userConfig: UserConfigFile,
  onSessionUpdate?: SessionPersist
): Promise<SupabaseClient | null> {
  lastAuthError = null;

  if (!SUPABASE_URL) {
    lastAuthError = 'ไม่มี SUPABASE_URL ในโปรแกรม';
    return null;
  }

  if (SERVER_KEY) {
    return createClient(SUPABASE_URL, SERVER_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  const accessToken = userConfig.accessToken?.trim();
  const refreshToken = userConfig.refreshToken?.trim();

  if (!ANON_KEY) {
    lastAuthError = missingServerKeyMessage();
    return null;
  }
  if (!accessToken && !refreshToken) {
    lastAuthError = missingServerKeyMessage();
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
