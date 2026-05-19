import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import type { LeaderboardEntry } from '@thesteamerzone/shared';

export type RoomLiveState = {
  win: number;
  winLabel: string;
  winGoal: number | null;
  winMin: number | null;
  winMax: number | null;
  topDonors: LeaderboardEntry[];
  topLikers: LeaderboardEntry[];
  totalLikes: number;
  likeGoal: number | null;
};

function parseBoard(raw: unknown): LeaderboardEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const userId = String(o.userId ?? o.user_id ?? '').trim();
      const nickname = String(o.nickname ?? o.name ?? userId).trim();
      const score = Number(o.score ?? o.coins ?? 0);
      if (!userId) return null;
      return { userId, nickname, score: Number.isFinite(score) ? score : 0 };
    })
    .filter((x): x is LeaderboardEntry => !!x);
}

function fromRow(data: Record<string, unknown>): RoomLiveState {
  const s = (data.state && typeof data.state === 'object'
    ? data.state
    : data) as Record<string, unknown>;
  return {
    win: Number(s.win ?? data.win ?? 0),
    winLabel: String(s.winLabel ?? data.win_label ?? 'WIN'),
    winGoal:
      s.winGoal === null || s.winGoal === undefined
        ? data.win_goal === null || data.win_goal === undefined
          ? null
          : Number(data.win_goal)
        : Number(s.winGoal),
    winMin:
      s.winMin === null || s.winMin === undefined
        ? data.win_min === null || data.win_min === undefined
          ? null
          : Number(data.win_min)
        : Number(s.winMin),
    winMax:
      s.winMax === null || s.winMax === undefined
        ? data.win_max === null || data.win_max === undefined
          ? null
          : Number(data.win_max)
        : Number(s.winMax),
    topDonors: parseBoard(s.topDonors ?? data.top_donors),
    topLikers: parseBoard(s.topLikers ?? data.top_likers),
    totalLikes: Number(s.totalLikes ?? data.total_likes ?? 0),
    likeGoal:
      s.likeGoal === null || s.likeGoal === undefined
        ? data.like_goal === null || data.like_goal === undefined
          ? null
          : Number(data.like_goal)
        : Number(s.likeGoal),
  };
}

const EMPTY: RoomLiveState = {
  win: 0,
  winLabel: 'WIN',
  winGoal: null,
  winMin: null,
  winMax: null,
  topDonors: [],
  topLikers: [],
  totalLikes: 0,
  likeGoal: null,
};

/** WIN + leaderboard จาก Realtime + live_state */
export function useRoomLiveState(roomId: string | undefined, token: string | null) {
  const [live, setLive] = useState<RoomLiveState>(EMPTY);

  const applyPayload = useCallback(
    (raw: Record<string, unknown>) => {
      const t = (raw.token as string) || '';
      if (token && t && t !== token) return;
      if (raw.type === 'state') {
        setLive(fromRow(raw));
      }
    },
    [token]
  );

  useEffect(() => {
    if (!roomId) return;
    const sb = getSupabase();
    if (!sb) return;

    void sb
      .from('live_state')
      .select(
        'win, win_label, win_goal, win_min, win_max, top_donors, top_likers, total_likes, like_goal'
      )
      .eq('room_id', roomId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLive(fromRow(data as Record<string, unknown>));
      });

    const ch = sb.channel(`room:${roomId}`);
    ch.on('broadcast', { event: 'state' }, (msg: unknown) => {
      const m = msg as Record<string, unknown>;
      const p = (
        m.payload && typeof m.payload === 'object' ? m.payload : m
      ) as Record<string, unknown>;
      applyPayload(p);
    });
    ch.subscribe();

    const pg = sb
      .channel(`live_state:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_state',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown> | null;
          if (row) setLive(fromRow(row));
        }
      )
      .subscribe();

    return () => {
      void ch.unsubscribe();
      void pg.unsubscribe();
    };
  }, [roomId, applyPayload, token]);

  return live;
}
