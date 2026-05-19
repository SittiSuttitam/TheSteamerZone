import type { SupabaseClient } from '@supabase/supabase-js';

const STALE_MS = 90_000;

export async function fetchConnectorLinkedAt(
  sb: SupabaseClient,
  roomId: string
): Promise<string | null> {
  const { data, error } = await sb
    .from('rooms')
    .select('connector_linked_at')
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw error;
  const at = data?.connector_linked_at as string | null | undefined;
  return at ?? null;
}

export function isConnectorRecentlyLinked(linkedAt: string | null): boolean {
  if (!linkedAt) return false;
  const age = Date.now() - new Date(linkedAt).getTime();
  return age >= 0 && age < STALE_MS;
}
