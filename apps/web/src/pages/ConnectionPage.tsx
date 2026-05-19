import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LinkStatusBar } from '../components/LinkStatusBar';
import { SetupChecklist } from '../components/SetupChecklist';
import { useAuth } from '../context/AuthContext';
import { useRoomCredentials } from '../hooks/useRoomCredentials';
import { connectorUrl, api } from '../lib/connector';
import { getFreshSessionTokens } from '../lib/sessionTokens';
import { getAppOrigin } from '../lib/appUrl';

type QuickResult = {
  webLinked?: boolean;
  tiktokError?: string | null;
  ready?: boolean;
  cloudSynced?: boolean;
  cloudSyncError?: string | null;
};

export function ConnectionPage() {
  const { session } = useAuth();
  const room = useRoomCredentials();
  const [tiktok, setTiktok] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showTech, setShowTech] = useState(false);

  useEffect(() => {
    if (room.user && room.supabaseConfigured && !room.roomId && !room.roomBusy) {
      void room.loadRoomFromAccount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.user?.id, room.supabaseConfigured]);

  async function connectAll() {
    setMsg(null);
    setOk(false);
    setBusy(true);
    try {
      if (!room.user) {
        setMsg('ล็อกอิน Google ก่อน (ลิงก์ด้านล่าง)');
        return;
      }
      setStep('โหลดห้องจากบัญชี…');
      let rid = room.roomId.trim();
      if (!rid) {
        rid = (await room.loadRoomFromAccount()) || '';
      }
      if (!rid) {
        setMsg(room.roomMsg || 'โหลดห้องไม่สำเร็จ — ลองอีกครั้ง');
        return;
      }
      setStep('เชื่อมเว็บกับโปรแกรม…');
      const health = await api<{ desktopAppOpen?: boolean }>(
        `${connectorUrl()}/health`
      ).catch(() => null);
      if (!health?.desktopAppOpen) {
        setMsg('เปิดโปรแกรม TheSteamerZone Connector บนเครื่องก่อน');
        return;
      }

      setStep('ยืนยันการล็อกอิน…');
      const tokens = await getFreshSessionTokens(session);
      if (!tokens.accessToken) {
        setMsg('เซสชันหมดอายุ — ออกจากระบบแล้วล็อกอิน Google ใหม่');
        return;
      }

      const result = await api<QuickResult>(`${connectorUrl()}/api/setup/quick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: rid,
          dashboardUrl: getAppOrigin(),
          tiktokUsername: tiktok.trim() || undefined,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      });
      setRefreshKey((n) => n + 1);
      if (result.webLinked) {
        setOk(true);
        if (result.cloudSynced === false) {
          setMsg(
            result.cloudSyncError ||
              'เว็บเชื่อมแล้ว แต่ซิงก์ OBS ยังไม่ได้ — ล็อกอินใหม่แล้วกดเชื่อมอีกครั้ง'
          );
        } else {
          setMsg(
            result.ready
              ? 'เชื่อมครบแล้ว — พร้อมไลฟ์'
              : result.tiktokError
                ? `เว็บ ↔ โปรแกรมเชื่อมแล้ว · ${result.tiktokError}`
                : 'เว็บ ↔ โปรแกรมเชื่อมแล้ว ✓'
          );
        }
      } else {
        setMsg('เปิดโปรแกรม Connector บนเครื่อง แล้วกดปุ่มนี้อีกครั้ง');
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'เปิดโปรแกรม Connector ก่อน');
    } finally {
      setStep(null);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">เริ่มใช้งาน</h1>
        <p className="text-sm leading-relaxed text-tsz-muted">
          เปิดโปรแกรมบนเครื่อง → ล็อกอินเว็บ → กดปุ่มเดียวด้านล่าง
        </p>
      </div>

      <LinkStatusBar
        refreshKey={refreshKey}
        onStatus={({ programOn, webLinked }) => {
          if (!programOn || !webLinked) {
            setOk(false);
            if (!programOn && msg?.includes('เชื่อม')) {
              setMsg('โปรแกรมปิดแล้ว — เปิดโปรแกรมแล้วกดเชื่อมต่ออีกครั้ง');
            }
          }
        }}
      />

      <section className="rounded-xl border-2 border-tsz-accent/50 bg-gradient-to-b from-tsz-accent/5 to-tsz-surface p-5 shadow-card">
        <h2 className="mb-2 text-base font-semibold">เชื่อมต่อทั้งหมด</h2>
        <p className="mb-4 text-xs leading-relaxed text-tsz-muted">
          ปุ่มเดียวจัดการ: โหลดห้อง + เชื่อมเว็บกับโปรแกรม
          {tiktok.trim() ? ' + TikTok Live' : ''}
        </p>

        {room.user ? (
          <p className="mb-3 text-sm text-tsz-muted">
            บัญชี: <strong>{room.user.email}</strong>
            {room.roomId && (
              <span className="block text-xs">ห้องโหลดแล้ว</span>
            )}
          </p>
        ) : (
          <p className="mb-3 text-sm text-amber-800">
            <Link to="/login" className="text-tsz-accent underline">
              ล็อกอิน Google
            </Link>{' '}
            ก่อน (ครั้งเดียว)
          </p>
        )}

        <details className="mb-4 rounded-lg border border-tsz-border bg-tsz-bg/50 p-3">
          <summary className="cursor-pointer text-sm font-medium">
            TikTok Live (ทำตอนเริ่มไลฟ์ — ไม่บังคับตอนนี้)
          </summary>
          <p className="mt-2 text-xs text-tsz-muted">
            โปรแกรมต้องรู้ชื่อห้องไลฟ์เพื่อรับของขวัญ/แชทไป Widget — ใส่ตอนไลฟ์จริงก็ได้
          </p>
          <input
            className="mt-2 w-full rounded-lg border border-tsz-border px-3 py-2 text-sm"
            placeholder="ชื่อผู้ใช้ TikTok (ไม่ใส่ @)"
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
          />
        </details>

        <button
          type="button"
          disabled={busy || !room.user}
          className="w-full rounded-xl bg-tsz-accent px-4 py-4 text-base font-semibold text-white shadow-md disabled:opacity-50"
          onClick={() => void connectAll()}
        >
          {busy ? step || 'กำลังเชื่อมต่อ…' : 'เชื่อมต่อทั้งหมด'}
        </button>

        {msg && (
          <p
            className={`mt-3 text-center text-sm ${ok ? 'text-green-700' : 'text-amber-900'}`}
            role="status"
          >
            {msg}
          </p>
        )}
        {room.roomMsg && !msg && (
          <p className="mt-2 text-center text-xs text-tsz-muted">{room.roomMsg}</p>
        )}
      </section>

      <SetupChecklist refreshKey={refreshKey} />

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-5 shadow-card">
        <h2 className="mb-2 text-base font-semibold">ขั้นถัดไป — OBS</h2>
        <p className="mb-3 text-xs text-tsz-muted">
          คัดลอกลิงก์ Widget ไปใส่ Browser Source
        </p>
        <Link
          to="/app/widgets"
          className="inline-block rounded-lg border border-tsz-border px-4 py-2 text-sm font-medium hover:bg-tsz-bg"
        >
          ไปหน้า Widgets →
        </Link>
      </section>

      <button
        type="button"
        className="text-xs text-tsz-accent underline"
        onClick={() => setShowTech((s) => !s)}
      >
        {showTech ? 'ซ่อน' : 'แสดง'}ข้อมูลสำหรับผู้ดูแลระบบ
      </button>
      {showTech && (
        <section className="rounded-lg border border-dashed border-tsz-border bg-tsz-bg/50 p-4 text-xs text-tsz-muted">
          <p>
            Connector: <code>{connectorUrl()}</code>
          </p>
        </section>
      )}
    </div>
  );
}
