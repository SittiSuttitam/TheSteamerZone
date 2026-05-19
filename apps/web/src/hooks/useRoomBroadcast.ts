import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';

export interface WinStateSlice {
  win: number;
  winLabel: string;
  winGoal: number | null;
  winMin: number | null;
  winMax: number | null;
}

export function useRoomBroadcast(
  roomId: string | undefined,
  token: string | null
) {
  const [state, setState] = useState<WinStateSlice | null>(null);
  const [live, setLive] = useState(false);

  const applyPayload = useCallback((raw: Record<string, unknown>) => {
    const t = (raw.token as string) || '';
    if (token && t && t !== token) return;
    if (raw.type === 'state' && raw.state && typeof raw.state === 'object') {
      const s = raw.state as Record<string, unknown>;
      setState({
        win: Number(s.win ?? 0),
        winLabel: String(s.winLabel ?? 'WIN'),
        winGoal: s.winGoal === null || s.winGoal === undefined ? null : Number(s.winGoal),
        winMin: s.winMin === null || s.winMin === undefined ? null : Number(s.winMin),
        winMax: s.winMax === null || s.winMax === undefined ? null : Number(s.winMax),
      });
      setLive(true);
    }
  }, [token]);

  useEffect(() => {
    if (!roomId) return;
    const s = getSupabase();
    if (!s) return;

    const ch = s.channel(`room:${roomId}`);
    ch.on('broadcast', { event: 'state' }, (msg: unknown) => {
      const m = msg as Record<string, unknown>;
      const p = (
        m.payload && typeof m.payload === 'object'
          ? m.payload
          : m
      ) as Record<string, unknown>;
      applyPayload(p);
    }).subscribe();

    return () => {
      void ch.unsubscribe();
    };
  }, [roomId, applyPayload]);

  useEffect(() => {
    if (!roomId) return;
    const s = getSupabase();
    if (!s) return;

    void s
      .from('live_state')
      .select('win, win_label, win_goal, win_min, win_max')
      .eq('room_id', roomId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return;
        setState({
          win: data.win,
          winLabel: data.win_label,
          winGoal: data.win_goal,
          winMin: data.win_min,
          winMax: data.win_max,
        });
      });
  }, [roomId]);

  return { state, live };
}
