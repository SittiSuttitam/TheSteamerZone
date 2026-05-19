const LS_ROOM = 'tsz_room_id';
const LS_TOKEN = 'tsz_widget_token';

export function clearRoomStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LS_ROOM);
  localStorage.removeItem(LS_TOKEN);
}

export { LS_ROOM, LS_TOKEN };
