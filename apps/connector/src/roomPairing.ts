import type { SupabaseClient } from '@supabase/supabase-js';
import {
  matchesRoomCode,
  pairingSecretMatches,
} from '@thesteamerzone/shared';

export type RoomPairRow = { id: string; widget_secret: string };

export async function resolveRoomForPairing(
  db: SupabaseClient,
  roomCode: string,
  pairingSecret: string
): Promise<RoomPairRow | null> {
  const code = roomCode.trim();
  const secret = pairingSecret.trim();
  if (!code || !secret) return null;

  const { data, error } = await db.from('rooms').select('id, widget_secret');
  if (error) throw error;
  const rows = (data ?? []) as RoomPairRow[];
  return (
    rows.find(
      (r) => matchesRoomCode(r.id, code) && pairingSecretMatches(r.widget_secret, secret)
    ) ?? null
  );
}

export async function touchConnectorLinked(
  db: SupabaseClient,
  roomId: string
): Promise<void> {
  const { error } = await db
    .from('rooms')
    .update({ connector_linked_at: new Date().toISOString() })
    .eq('id', roomId);
  if (error) throw error;
}
