import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** Broadcast to Supabase Realtime channel `room:{roomId}` */
export function createRealtimePublisher(
  supabase: SupabaseClient,
  getWidgetToken: (roomId: string) => Promise<string | null>
) {
  const channels = new Map<string, RealtimeChannel>();
  const channelReady = new Map<string, Promise<void>>();

  function ensureChannel(roomId: string): RealtimeChannel {
    const name = `room:${roomId}`;
    let ch = channels.get(roomId);
    if (!ch) {
      ch = supabase.channel(name, {
        config: { broadcast: { ack: false } },
      });
      channels.set(roomId, ch);
      const ready = new Promise<void>((resolve) => {
        const done = () => resolve();
        const timer = setTimeout(() => {
          console.warn(`[realtime] subscribe timeout room:${roomId}`);
          done();
        }, 8000);
        ch!.subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timer);
            done();
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timer);
            console.warn(
              `[realtime] ${status} room:${roomId}`,
              err instanceof Error ? err.message : err
            );
            done();
          }
        });
      });
      channelReady.set(roomId, ready);
    }
    return ch!;
  }

  return {
    supabase,

    async broadcast(
      roomId: string,
      event: string,
      payload: Record<string, unknown>
    ) {
      try {
        ensureChannel(roomId);
        await channelReady.get(roomId);
        const token = (await getWidgetToken(roomId)) || '';
        const body = { ...payload, token };
        const ch = ensureChannel(roomId);
        await ch.send({
          type: 'broadcast',
          event,
          payload: body,
        });
      } catch (e) {
        console.warn('[broadcast]', event, e instanceof Error ? e.message : e);
      }
    },

    async upsertLiveState(
      roomId: string,
      row: {
        win: number;
        win_label?: string;
        win_goal?: number | null;
        win_min?: number | null;
        win_max?: number | null;
        top_donors?: unknown;
        top_likers?: unknown;
        total_likes?: number;
        like_goal?: number | null;
        meta?: Record<string, unknown>;
      }
    ) {
      try {
        const { error } = await supabase.from('live_state').upsert(
          {
            room_id: roomId,
            win: row.win,
            win_label: row.win_label ?? 'WIN',
            win_goal: row.win_goal ?? null,
            win_min: row.win_min ?? null,
            win_max: row.win_max ?? null,
            top_donors: row.top_donors ?? [],
            top_likers: row.top_likers ?? [],
            total_likes: row.total_likes ?? 0,
            like_goal: row.like_goal ?? null,
            meta: row.meta ?? {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'room_id' }
        );
        if (error) console.warn('[live_state]', error.message);
      } catch (e) {
        console.warn('[live_state]', e instanceof Error ? e.message : e);
      }
    },
  };
}

export type RealtimePublisher = ReturnType<typeof createRealtimePublisher>;
