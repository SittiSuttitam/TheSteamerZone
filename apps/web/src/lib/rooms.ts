import type { SupabaseClient } from '@supabase/supabase-js';

export type RoomRow = {
  id: string;
  name: string;
  widget_secret: string;
  owner_id: string | null;
};

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

export async function fetchMyRooms(
  supabase: SupabaseClient,
  userId: string
): Promise<RoomRow[]> {
  const { data, error } = await withTimeout(
    supabase
      .from('rooms')
      .select('id, name, widget_secret, owner_id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
      .then((r) => r),
    12_000,
    'โหลดห้องช้าเกินไป — ตรวจว่ารัน SQL migration ใน Supabase แล้ว'
  );
  if (error) throw error;
  return (data ?? []) as RoomRow[];
}

/** สร้างห้องแรกถ้ายังไม่มี (ผู้ใช้เก่าก่อนมี trigger) */
export async function ensureDefaultRoom(
  supabase: SupabaseClient,
  userId: string
): Promise<RoomRow> {
  const existing = await fetchMyRooms(supabase, userId);
  if (existing.length > 0) return existing[0]!;

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .insert({ owner_id: userId, name: 'ห้องของฉัน' })
    .select('id, name, widget_secret, owner_id')
    .single();
  if (roomErr) throw roomErr;

  await supabase
    .from('live_state')
    .upsert({ room_id: room.id }, { onConflict: 'room_id' });

  return room as RoomRow;
}
