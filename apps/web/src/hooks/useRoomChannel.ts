import { useEffect, useRef } from 'react';
import { getSupabase } from '../lib/supabase';

/** Subscribe to Supabase Realtime broadcast on `room:{roomId}` */
export function useRoomChannel(
  roomId: string | undefined,
  token: string | null,
  handlers: Record<string, (payload: Record<string, unknown>) => void>
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!roomId) return;
    const s = getSupabase();
    if (!s) return;

    const ch = s.channel(`room:${roomId}`);
    const entries = Object.entries(handlersRef.current);
    for (const [event, fn] of entries) {
      ch.on('broadcast', { event }, (msg: unknown) => {
        const m = msg as Record<string, unknown>;
        const p = (
          m.payload && typeof m.payload === 'object' ? m.payload : m
        ) as Record<string, unknown>;
        const t = (p.token as string) || '';
        if (token && t && t !== token) return;
        fn(p);
      });
    }
    ch.subscribe();

    return () => {
      void ch.unsubscribe();
    };
  }, [roomId, token]);
}
