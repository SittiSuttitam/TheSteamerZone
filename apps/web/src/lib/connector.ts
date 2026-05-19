import { getProductionSiteUrl } from './appUrl';

/**
 * เว็บ HTTPS (Vercel) เรียก 127.0.0.1 ได้เฉพาะเมื่อ Connector ตอบ Private Network Access
 * หรือเปิดแดชบอร์ดจาก localhost — ใช้เช็กก่อน sync ไม่บังคับ
 */
export function canReachLocalConnector(): boolean {
  if (typeof window === 'undefined') return false;
  const base = connectorUrl();
  try {
    const u = new URL(base);
    const isLoopback =
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1' ||
      u.hostname === '[::1]';
    if (!isLoopback) return true;
    if (window.location.protocol !== 'https:') return true;
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
  } catch {
    return false;
  }
}

/** แดชบอร์ดบน Vercel (HTTPS) — ไม่ควร poll loopback ทุก 2–4 วินาที */
export function isRemoteHttpsDashboard(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.protocol !== 'https:') return false;
  const h = window.location.hostname;
  return h !== 'localhost' && h !== '127.0.0.1';
}

/** เรียก Connector แบบพื้นหลัง — ไม่ fetch ถ้าเบราว์เซอร์จะบล็อก loopback */
export async function connectorApi<T>(
  path: string,
  init?: RequestInit
): Promise<T | null> {
  if (!canReachLocalConnector()) return null;
  const url = path.startsWith('http')
    ? path
    : `${connectorUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  try {
    return await api<T>(url, init);
  } catch {
    return null;
  }
}

/** Base URL for the desktop connector (local). Override in production dashboard. */
export function connectorUrl(): string {
  const fromEnv = import.meta.env.VITE_CONNECTOR_URL as string | undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const ls = localStorage.getItem('thesteamerzone_connector_url');
    if (ls) return ls.replace(/\/$/, '');
  }
  return 'http://127.0.0.1:8780';
}

/** แปลง path หรือ URL จาก connector ให้ตรงกับที่ตั้งในแดชบอร์ด */
export function connectorAssetUrl(pathOrUrl: string): string {
  const base = connectorUrl();
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    try {
      const parsed = new URL(pathOrUrl);
      if (parsed.pathname.startsWith('/api/')) {
        return `${base}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      /* use as-is */
    }
    return pathOrUrl;
  }
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${p}`;
}

export function connectorFetchError(url: string, cause?: unknown): string {
  const isLocal =
    url.includes('127.0.0.1') || url.includes('localhost');
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    isLocal
  ) {
    return `เว็บ HTTPS เรียก Connector บนเครื่องโดยตรงไม่ได้ — เปิดแดชบอร์ดที่ ${getProductionSiteUrl()} แล้วเปิดโปรแกรม Connector`;
  }
  if (isLocal) {
    return 'เปิดโปรแกรม TheSteamerZone Connector บนเครื่องก่อน (หรือรัน npm run dev:connector)';
  }
  return cause instanceof Error ? cause.message : 'เชื่อม Connector ไม่ได้';
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new Error(connectorFetchError(url, e));
  }
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}
