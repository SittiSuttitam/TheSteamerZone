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

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new Error(`Fetch failed: ${url}`);
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
