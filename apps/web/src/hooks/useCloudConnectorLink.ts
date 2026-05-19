import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import {
  fetchConnectorLinkedAt,
  isConnectorRecentlyLinked,
} from '../lib/connectorLinkCloud';

/** สถานะ Connector จาก Supabase (ใช้บน Vercel แทน polling localhost) */
export function useCloudConnectorLink(roomId: string) {
  const [linked, setLinked] = useState(false);
  const [linkedAt, setLinkedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const rid = roomId.trim();
    const sb = getSupabase();
    if (!rid || !sb) {
      setLinked(false);
      setLinkedAt(null);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const at = await fetchConnectorLinkedAt(sb, rid);
        if (cancelled) return;
        setLinkedAt(at);
        setLinked(isConnectorRecentlyLinked(at));
        setErr(null);
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : String(e));
        setLinked(false);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [roomId]);

  return { linked, linkedAt, err };
}
