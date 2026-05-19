import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSupabase } from '../lib/supabase';
import { ensureDefaultRoom, fetchMyRooms } from '../lib/rooms';
import { widgetBaseUrl } from '../lib/appUrl';
import { LS_ROOM, LS_TOKEN, clearRoomStorage } from '../lib/roomStorage';

export function useRoomCredentials() {
  const { user, supabaseConfigured } = useAuth();
  const [roomBusy, setRoomBusy] = useState(false);
  const [roomMsg, setRoomMsg] = useState<string | null>(null);
  const [roomId, setRoomId] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(LS_ROOM) || '' : ''
  );
  const [widgetToken, setWidgetToken] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(LS_TOKEN) || '' : ''
  );

  useEffect(() => {
    if (!user) return;
    const v = roomId.trim();
    if (v) localStorage.setItem(LS_ROOM, v);
    else localStorage.removeItem(LS_ROOM);
  }, [roomId, user?.id]);

  useEffect(() => {
    if (!user) {
      setRoomId('');
      setWidgetToken('');
      clearRoomStorage();
    }
  }, [user?.id]);

  useEffect(() => {
    const v = widgetToken.trim();
    if (v) localStorage.setItem(LS_TOKEN, v);
    else localStorage.removeItem(LS_TOKEN);
  }, [widgetToken]);

  const query = widgetToken.trim()
    ? `?token=${encodeURIComponent(widgetToken.trim())}`
    : '';

  function widgetUrl(slug: string) {
    const rid = roomId.trim() || 'YOUR_ROOM_UUID';
    return `${widgetBaseUrl()}/w/${rid}/${slug}${query}`;
  }

  const ready = !!roomId.trim();

  const loadRoomFromAccount = useCallback(async (): Promise<string | null> => {
    const sb = getSupabase();
    if (!sb || !user) {
      setRoomMsg('ล็อกอิน Google ก่อน');
      return null;
    }
    setRoomBusy(true);
    setRoomMsg(null);
    try {
      const work = async () => {
        const rooms = await fetchMyRooms(sb, user.id);
        return rooms[0] ?? (await ensureDefaultRoom(sb, user.id));
      };
      const room = await Promise.race([
        work(),
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error('หมดเวลา — ตรวจ Supabase')), 15_000)
        ),
      ]);
      setRoomId(room.id);
      setWidgetToken(room.widget_secret);
      setRoomMsg(`โหลดห้อง "${room.name}" แล้ว`);
      return room.id;
    } catch (e) {
      setRoomMsg(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setRoomBusy(false);
    }
  }, [user?.id]);

  return {
    user,
    supabaseConfigured,
    roomBusy,
    roomMsg,
    roomId,
    setRoomId,
    widgetToken,
    setWidgetToken,
    widgetUrl,
    ready,
    loadRoomFromAccount,
    clearRoomStorage,
  };
}
