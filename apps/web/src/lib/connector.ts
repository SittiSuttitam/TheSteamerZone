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
    return 'เว็บ HTTPS (เช่น Vercel) เชื่อมโปรแกรมบนเครื่องไม่ได้ — เปิดแดชบอร์ดที่ http://localhost:5173';
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
