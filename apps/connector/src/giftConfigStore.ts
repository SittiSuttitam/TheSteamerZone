import fs from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  defaultGiftConfig,
  normalizeGiftConfig,
  type GiftConfigShape,
} from '@thesteamerzone/shared';
import type { GiftConfigFile } from './config.js';

function localPath(dataDir: string, roomId: string): string {
  const safe = roomId.replace(/[^a-zA-Z0-9-]/g, '_');
  return path.join(dataDir, `gift-config-${safe}.json`);
}

export function loadGiftConfigLocal(
  dataDir: string,
  roomId: string
): GiftConfigFile {
  const p = localPath(dataDir, roomId);
  if (!fs.existsSync(p)) {
    return defaultGiftConfig() as GiftConfigFile;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as unknown;
    return normalizeGiftConfig(raw) as GiftConfigFile;
  } catch {
    return defaultGiftConfig() as GiftConfigFile;
  }
}

export function saveGiftConfigLocal(
  dataDir: string,
  roomId: string,
  cfg: GiftConfigShape
): void {
  const p = localPath(dataDir, roomId);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8');
}

export async function loadGiftConfigCloud(
  supabase: SupabaseClient,
  roomId: string
): Promise<GiftConfigShape | null> {
  const { data, error } = await supabase
    .from('room_gift_config')
    .select('config')
    .eq('room_id', roomId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.config) return null;
  return normalizeGiftConfig(data.config);
}

export async function saveGiftConfigCloud(
  supabase: SupabaseClient,
  roomId: string,
  cfg: GiftConfigShape
): Promise<void> {
  const { error } = await supabase.from('room_gift_config').upsert(
    {
      room_id: roomId,
      config: cfg,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'room_id' }
  );
  if (error) throw error;
}

export async function loadGiftConfigForRoom(
  supabase: SupabaseClient | null,
  dataDir: string,
  roomId: string
): Promise<GiftConfigFile> {
  if (supabase && roomId) {
    try {
      const cloud = await loadGiftConfigCloud(supabase, roomId);
      if (cloud) {
        saveGiftConfigLocal(dataDir, roomId, cloud);
        return cloud as GiftConfigFile;
      }
    } catch (e) {
      console.warn('[gift-config] cloud load failed', e instanceof Error ? e.message : e);
    }
  }
  return loadGiftConfigLocal(dataDir, roomId);
}

export async function saveGiftConfigForRoom(
  supabase: SupabaseClient | null,
  dataDir: string,
  roomId: string,
  cfg: GiftConfigShape
): Promise<void> {
  saveGiftConfigLocal(dataDir, roomId, cfg);
  if (supabase && roomId) {
    await saveGiftConfigCloud(supabase, roomId, cfg);
  }
}
