import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

export function ChatWidget() {
  const { roomId } = useParams<{ roomId: string }>();
  const [search] = useSearchParams();
  const token = search.get('token');
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!roomId) return;
    const s = getSupabase();
    if (!s) return;
    const ch = s.channel(`room:${roomId}`);
    ch.on('broadcast', { event: 'chat' }, (msg: unknown) => {
      const m = msg as Record<string, unknown>;
      const payload = (
        m.payload && typeof m.payload === 'object' ? m.payload : m
      ) as Record<string, unknown>;
      const t = (payload.token as string) || '';
      if (token && t && t !== token) return;
      setLines((prev) =>
        [...prev.slice(-40), JSON.stringify(payload)].filter(Boolean)
      );
    }).subscribe();
    return () => {
      void ch.unsubscribe();
    };
  }, [roomId, token]);

  return (
    <div className="min-h-[120px] rounded-lg bg-black/35 p-2 text-left text-sm text-white backdrop-blur-sm">
      {lines.length === 0 ? (
        <span className="opacity-50">Chat overlay — waiting for chat events</span>
      ) : (
        lines.map((l, i) => <div key={i}>{l}</div>)
      )}
    </div>
  );
}
