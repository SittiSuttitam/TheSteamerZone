/**
 * Load advanced actions from Supabase for a room (service role on connector).
 * Gift mapping remains in local gift-config.json until fully migrated.
 */
export async function fetchActionsForRoom(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  roomId: string
) {
  const { data, error } = await supabase
    .from('actions')
    .select('*')
    .eq('room_id', roomId)
    .order('priority', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
