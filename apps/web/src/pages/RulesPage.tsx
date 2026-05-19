import { useCallback, useEffect, useState } from 'react';
import { GiftRulesEditor, type GiftConfig } from '../components/GiftRulesEditor';
import { useAuth } from '../context/AuthContext';
import { useRoomCredentials } from '../hooks/useRoomCredentials';
import { getSupabase } from '../lib/supabase';
import { fetchRoomGiftConfig } from '../lib/giftConfigCloud';
import { canReachLocalConnector, connectorUrl, api } from '../lib/connector';

export function RulesPage() {
  const { user, supabaseConfigured } = useAuth();
  const room = useRoomCredentials();
  const [config, setConfig] = useState<GiftConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) {
      setErr('ล็อกอิน Google แล้วกดโหลดห้องจากบัญชี');
      setConfig(null);
      setLoading(false);
      return;
    }
    let roomId = room.roomId.trim();
    if (!roomId) {
      roomId = (await room.loadRoomFromAccount()) ?? '';
    }
    if (!roomId) {
      setErr('ยังไม่มีห้อง — ไปหน้าเริ่มใช้งานหรือกดโหลดห้องด้านล่าง');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchRoomGiftConfig(sb, roomId);
      setConfig(data);
      setErr(null);
      if (canReachLocalConnector()) {
        try {
          await api(`${connectorUrl()}/api/config/gift`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
        } catch {
          /* connector offline — ใช้ข้อมูลจากคลาวด์ */
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, room.roomId, room.loadRoomFromAccount]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!supabaseConfigured) {
    return (
      <p className="text-sm text-tsz-muted">ตั้งค่า Supabase ใน .env ก่อน</p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">กฎของขวัญ</h1>
      <p className="mb-4 text-sm leading-relaxed text-tsz-muted">
        กฎถูกเก็บแยกตาม<strong className="text-tsz-text">ห้องของคุณ</strong> บน Supabase —
        คนอื่นมองไม่เห็น · Connector บนเครื่องคุณจะโหลดกฎของห้องที่เชื่อมอยู่เท่านั้น
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={room.roomBusy || !user}
          className="rounded-lg bg-tsz-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void load()}
        >
          {room.roomBusy ? 'กำลังโหลดห้อง…' : 'โหลดห้อง + กฎของฉัน'}
        </button>
        {room.ready && (
          <span className="font-mono text-[11px] text-tsz-muted">
            ห้อง: {room.roomId.slice(0, 8)}…
          </span>
        )}
      </div>
      {room.roomMsg && <p className="mb-2 text-xs text-tsz-muted">{room.roomMsg}</p>}

      {err && !loading && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {err}
          {err.includes('room_gift_config') ? (
            <>
              {' '}
              — รัน migration <code>20250519140000_room_gift_config.sql</code> ใน Supabase
            </>
          ) : null}
        </p>
      )}

      {status && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {status}
        </p>
      )}

      <GiftRulesEditor
        initial={config}
        loading={loading}
        loadFailed={!!err}
        roomId={room.roomId}
        onSaved={setStatus}
      />
    </div>
  );
}
