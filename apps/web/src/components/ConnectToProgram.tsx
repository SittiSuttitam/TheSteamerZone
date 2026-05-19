import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { connectorUrl, api } from '../lib/connector';

type Props = {
  roomId: string;
  roomName?: string;
  onSuccess?: () => void;
};

/** ส่งรหัสห้องไปโปรแกรม Connector บนเครื่อง (ผู้ใช้ไม่ต้องรู้ DB) */
export function ConnectToProgram({ roomId, roomName, onSuccess }: Props) {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const shortCode = roomId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const displayCode =
    shortCode.length >= 8
      ? `${shortCode.slice(0, 4)}-${shortCode.slice(4, 8)}`
      : roomId.slice(0, 8);

  async function pushToProgram() {
    if (!roomId.trim()) {
      setMsg('โหลดห้องจากบัญชีก่อน (ปุ่มด้านบน)');
      return;
    }
    setBusy(true);
    setMsg(null);
    setOk(false);
    try {
      await api(`${connectorUrl()}/api/setup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: roomId.trim(),
          dashboardUrl: window.location.origin,
          setupCompleted: true,
          accessToken: session?.access_token,
          refreshToken: session?.refresh_token,
        }),
      });
      setOk(true);
      setMsg('เชื่อมกับโปรแกรมบนเครื่องแล้ว ✓');
      onSuccess?.();
    } catch {
      setMsg(
        'เปิดโปรแกรม TheSteamerZone Connector บนเครื่องก่อน แล้วกดปุ่มนี้อีกครั้ง'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border-2 border-tsz-accent/40 bg-gradient-to-b from-tsz-accent/5 to-tsz-surface p-5 shadow-card">
      <h2 className="mb-1 text-sm font-semibold text-tsz-text">
        เชื่อมกับโปรแกรมบนเครื่อง
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-tsz-muted">
        แค่เปิดโปรแกรม TheSteamerZone Connector บนเครื่อง แล้วกดปุ่มด้านล่าง — ไม่ต้องแก้ไฟล์อะไรเอง
      </p>

      {roomId ? (
        <>
          <p className="text-xs text-tsz-muted">รหัสห้องของคุณ{roomName ? ` (${roomName})` : ''}</p>
          <p className="mb-1 font-mono text-2xl font-bold tracking-widest text-tsz-accent">
            {displayCode}
          </p>
          <p className="mb-4 break-all text-[10px] text-tsz-muted">{roomId}</p>
          <button
            type="button"
            disabled={busy}
            className="w-full rounded-lg bg-tsz-accent px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => void pushToProgram()}
          >
            {busy ? 'กำลังส่ง…' : 'ส่งไปโปรแกรม Connector'}
          </button>
        </>
      ) : (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ล็อกอิน Google แล้วกด「โหลดห้องจากบัญชี」ก่อน
        </p>
      )}

      {msg && (
        <p
          className={`mt-3 text-sm ${ok ? 'text-green-700' : 'text-amber-800'}`}
          role="status"
        >
          {msg}
        </p>
      )}
    </section>
  );
}
