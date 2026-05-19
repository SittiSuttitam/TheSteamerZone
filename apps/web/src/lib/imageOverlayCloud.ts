import type { SupabaseClient } from '@supabase/supabase-js';
import { legacySamplePath } from './legacySamples';

export const IMAGE_SLOTS = ['positive', 'negative', 'heart', 'hammer'] as const;
export type ImageSlot = (typeof IMAGE_SLOTS)[number];

export const DEMO_FILES: Record<ImageSlot, string> = {
  positive: 'positive.png',
  negative: 'negative.png',
  heart: 'heart.png',
  hammer: 'hammer.png',
};

const BUCKET = 'overlay-images';
const PATH_COL: Record<ImageSlot, keyof UserOverlayRow> = {
  positive: 'positive_path',
  negative: 'negative_path',
  heart: 'heart_path',
  hammer: 'hammer_path',
};

type UserOverlayRow = {
  user_id: string;
  positive_path: string | null;
  negative_path: string | null;
  heart_path: string | null;
  hammer_path: string | null;
};

export type OverlaySlotView = {
  slot: ImageSlot;
  url: string;
  isCustom: boolean;
  storagePath: string | null;
};

export function demoUrl(slot: ImageSlot): string {
  return legacySamplePath(DEMO_FILES[slot]);
}

function publicStorageUrl(sb: SupabaseClient, storagePath: string): string {
  const { data } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

function rowToSlots(sb: SupabaseClient, row: UserOverlayRow | null): Record<ImageSlot, OverlaySlotView> {
  const out = {} as Record<ImageSlot, OverlaySlotView>;
  for (const slot of IMAGE_SLOTS) {
    const storagePath = row?.[PATH_COL[slot]] ?? null;
    const isCustom = !!storagePath;
    out[slot] = {
      slot,
      storagePath,
      isCustom,
      url: isCustom ? publicStorageUrl(sb, storagePath) : demoUrl(slot),
    };
  }
  return out;
}

export async function ensureOverlayRow(sb: SupabaseClient, userId: string): Promise<void> {
  const { error } = await sb.from('user_overlay_images').upsert(
    { user_id: userId },
    { onConflict: 'user_id', ignoreDuplicates: true }
  );
  if (error) throw error;
}

export async function fetchUserOverlaySlots(
  sb: SupabaseClient,
  userId: string
): Promise<Record<ImageSlot, OverlaySlotView>> {
  await ensureOverlayRow(sb, userId);
  const { data, error } = await sb
    .from('user_overlay_images')
    .select('user_id, positive_path, negative_path, heart_path, hammer_path')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return rowToSlots(sb, (data as UserOverlayRow | null) ?? null);
}

export async function fetchRoomOwnerOverlaySlots(
  sb: SupabaseClient,
  roomId: string
): Promise<Record<ImageSlot, OverlaySlotView>> {
  const { data: room, error: roomErr } = await sb
    .from('rooms')
    .select('owner_id')
    .eq('id', roomId)
    .maybeSingle();
  if (roomErr) throw roomErr;
  const ownerId = room?.owner_id as string | null | undefined;
  if (!ownerId) {
    return rowToSlots(sb, null);
  }
  const { data, error } = await sb
    .from('user_overlay_images')
    .select('user_id, positive_path, negative_path, heart_path, hammer_path')
    .eq('user_id', ownerId)
    .maybeSingle();
  if (error) throw error;
  return rowToSlots(sb, (data as UserOverlayRow | null) ?? null);
}

function extFromFilename(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  const ext = (m?.[1] || 'png').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'png';
}

export async function uploadUserOverlayImage(
  sb: SupabaseClient,
  userId: string,
  slot: ImageSlot,
  file: File
): Promise<Record<ImageSlot, OverlaySlotView>> {
  const ext = extFromFilename(file.name);
  const storagePath = `${userId}/${slot}.${ext}`;

  const { data: existing } = await sb
    .from('user_overlay_images')
    .select('positive_path, negative_path, heart_path, hammer_path')
    .eq('user_id', userId)
    .maybeSingle();

  const oldPath = (existing as UserOverlayRow | null)?.[PATH_COL[slot]] ?? null;
  if (oldPath && oldPath !== storagePath) {
    await sb.storage.from(BUCKET).remove([oldPath]);
  }

  const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, file, {
    upsert: true,
    contentType: file.type || `image/${ext}`,
  });
  if (upErr) throw upErr;

  const patch = { user_id: userId, [PATH_COL[slot]]: storagePath };
  const { error: dbErr } = await sb.from('user_overlay_images').upsert(patch, {
    onConflict: 'user_id',
  });
  if (dbErr) throw dbErr;

  return fetchUserOverlaySlots(sb, userId);
}

export async function deleteUserOverlayImage(
  sb: SupabaseClient,
  userId: string,
  slot: ImageSlot
): Promise<Record<ImageSlot, OverlaySlotView>> {
  const { data: row, error: loadErr } = await sb
    .from('user_overlay_images')
    .select('positive_path, negative_path, heart_path, hammer_path')
    .eq('user_id', userId)
    .maybeSingle();
  if (loadErr) throw loadErr;

  const storagePath = (row as UserOverlayRow | null)?.[PATH_COL[slot]] ?? null;
  if (storagePath) {
    await sb.storage.from(BUCKET).remove([storagePath]);
  }

  const { error: dbErr } = await sb
    .from('user_overlay_images')
    .upsert({ user_id: userId, [PATH_COL[slot]]: null }, { onConflict: 'user_id' });
  if (dbErr) throw dbErr;

  return fetchUserOverlaySlots(sb, userId);
}

export function slotsToUrlMap(slots: Record<ImageSlot, OverlaySlotView>): Record<ImageSlot, string> {
  const urls = {} as Record<ImageSlot, string>;
  for (const slot of IMAGE_SLOTS) {
    urls[slot] = slots[slot].url;
  }
  return urls;
}
