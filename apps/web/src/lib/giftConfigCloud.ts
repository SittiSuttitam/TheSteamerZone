import type { SupabaseClient } from '@supabase/supabase-js';
import {
  defaultGiftConfig,
  normalizeGiftConfig,
  type GiftConfigShape,
} from '@thesteamerzone/shared';

export type { GiftConfigShape as GiftConfig };

export async function fetchRoomGiftConfig(
  sb: SupabaseClient,
  roomId: string
): Promise<GiftConfigShape> {
  const { data, error } = await sb
    .from('room_gift_config')
    .select('config')
    .eq('room_id', roomId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.config) return defaultGiftConfig();
  return normalizeGiftConfig(data.config);
}

export async function saveRoomGiftConfig(
  sb: SupabaseClient,
  roomId: string,
  config: GiftConfigShape
): Promise<void> {
  const { error } = await sb.from('room_gift_config').upsert(
    {
      room_id: roomId,
      config,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'room_id' }
  );
  if (error) throw error;
}

/** ตรวจว่าห้องเป็นของผู้ใช้ที่ล็อกอิน */
export async function assertRoomOwner(
  sb: SupabaseClient,
  roomId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await sb
    .from('rooms')
    .select('owner_id')
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw error;
  return data?.owner_id === userId;
}
