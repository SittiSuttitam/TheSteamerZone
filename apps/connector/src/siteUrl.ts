/** แดชบอร์ด production — ใช้เมื่อไม่มี WEB_PUBLIC_URL ใน .env */
export const PRODUCTION_WEB_SITE = 'https://thesteamerzone.vercel.app';

export function resolveWebPublicUrl(envValue?: string): string {
  const fromEnv = (envValue || process.env.WEB_PUBLIC_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return PRODUCTION_WEB_SITE;
}

/** แก้ user-config เก่าที่ชี้ localhost */
export function normalizeDashboardUrl(url?: string, webPublic?: string): string | undefined {
  const base = (webPublic || resolveWebPublicUrl()).replace(/\/$/, '');
  if (!url?.trim()) return url;
  const u = url.trim().replace(/\/$/, '');
  if (
    u.includes('localhost') ||
    u.includes('127.0.0.1:5173') ||
    u === 'http://localhost:5173'
  ) {
    return base;
  }
  return u;
}
