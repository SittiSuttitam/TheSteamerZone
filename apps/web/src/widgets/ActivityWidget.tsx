import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

/** Activity / chat-style feed — subscribes to broadcast events activity + chat */
export function ActivityWidget() {
  const { roomId } = useParams<{ roomId: string }>();
  const [search] = useSearchParams();
  const token = search.get('token');
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!roomId) return;
    const s = getSupabase();
    if (!s) return;
    const ch = s.channel(`room:${roomId}`);

    const push = (kind: string, payload: Record<string, unknown>) => {
      const t = (payload.token as string) || '';
      if (token && t && t !== token) return;
      setLines((prev) => [...prev.slice(-40), `${kind}: ${JSON.stringify(payload)}`]);
    };

    ch.on('broadcast', { event: 'activity' }, (msg) => {
      push('activity', (msg.payload as Record<string, unknown>) || {});
    })
      .on('broadcast', { event: 'chat' }, (msg) => {
        push('chat', (msg.payload as Record<string, unknown>) || {});
      })
      .subscribe();

    return () => {
      void ch.unsubscribe();
    };
  }, [roomId, token]);

  return (
    <div className="max-h-[320px] min-h-[120px] overflow-y-auto rounded-xl bg-black/40 p-3 font-mono text-xs text-white backdrop-blur-sm">
      {lines.length === 0 ? (
        <span className="opacity-50">Waiting for connector events…</span>
      ) : (
        lines.map((l, i) => <div key={i}>{l}</div>)
      )}
    </div>
  );
}
