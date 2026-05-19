import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LinkStatusBar } from '../components/LinkStatusBar';
import { RoomPairingCard } from '../components/RoomPairingCard';
import { SetupChecklist } from '../components/SetupChecklist';
import { useAuth } from '../context/AuthContext';
import { useCloudConnectorLink } from '../hooks/useCloudConnectorLink';
import { useRoomCredentials } from '../hooks/useRoomCredentials';
import {
  canReachLocalConnector,
  connectorUrl,
  api,
} from '../lib/connector';
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
  const cloud = useCloudConnectorLink(room.roomId);
  const [tiktok, setTiktok] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (room.user && room.supabaseConfigured && !room.roomId && !room.roomBusy) {
      void room.loadRoomFromAccount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.user?.id, room.supabaseConfigured]);

  useEffect(() => {
    if (cloud.linked) {
      setOk(true);
      setMsg('โปรแกรมเชื่อมห้องแล้ว ✓');
    }
  }, [cloud.linked]);

  async function connectViaLocalhost() {
    setMsg(null);
    setOk(false);
    setBusy(true);
    try {
      if (!room.user) {
        setMsg('ล็อกอิน Google ก่อน');
        return;
      }
      let rid = room.roomId.trim();
      if (!rid) rid = (await room.loadRoomFromAccount()) || '';
      if (!rid) {
        setMsg(room.roomMsg || 'โหลดห้องไม่สำเร็จ');
        return;
      }
      setStep('เชื่อมผ่าน localhost…');
      const health = await api<{ desktopAppOpen?: boolean }>(
        `${connectorUrl()}/health`
      ).catch(() => null);
      if (!health?.desktopAppOpen) {
        setMsg('เปิดโปรแกรม Connector แล้วกรอกรหัสห้องในโปรแกรม (หรืออนุญาต Local network)');
        return;
      }
      const tokens = await getFreshSessionTokens(session);
      if (!tokens.accessToken) {
        setMsg('เซสชันหมดอายุ — ล็อกอินใหม่');
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
        setMsg(result.ready ? 'เชื่อมครบแล้ว — พร้อมไลฟ์' : 'เว็บ ↔ โปรแกรมเชื่อมแล้ว ✓');
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'เชื่อมไม่สำเร็จ');
    } finally {
      setStep(null);
      setBusy(false);
    }
  }

  const paired = cloud.linked || ok;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">เริ่มใช้งาน</h1>
        <p className="text-sm leading-relaxed text-tsz-muted">
          ล็อกอินเว็บ → คัดลอกรหัส → กรอกในโปรแกรม Connector บนเครื่อง
        </p>
      </div>

      <LinkStatusBar
        roomId={room.roomId}
        refreshKey={refreshKey}
        onStatus={({ programOn, webLinked }) => {
          if (!programOn && !webLinked && msg?.includes('เชื่อม')) {
            setOk(false);
          }
        }}
      />

      {!room.user ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Link to="/login" className="text-tsz-accent underline">
            ล็อกอิน Google
          </Link>{' '}
          ก่อนเพื่อสร้างห้องและรหัสเชื่อม
        </p>
      ) : room.roomId && room.widgetToken ? (
        <RoomPairingCard
          roomId={room.roomId}
          widgetSecret={room.widgetToken}
        />
      ) : (
        <section className="rounded-xl border border-tsz-border bg-tsz-surface p-5">
          <p className="mb-3 text-sm text-tsz-muted">กำลังโหลดห้องจากบัญชี…</p>
          <button
            type="button"
            disabled={room.roomBusy}
            className="rounded-lg bg-tsz-accent px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={() => void room.loadRoomFromAccount()}
          >
            {room.roomBusy ? 'กำลังโหลด…' : 'โหลดห้องของฉัน'}
          </button>
        </section>
      )}

      {paired && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-sm text-green-800">
          {msg || 'โปรแกรมเชื่อมห้องแล้ว — ไปตั้ง Widgets ใน OBS ได้'}
        </p>
      )}

      <details className="rounded-xl border border-tsz-border bg-tsz-bg/50 p-3">
        <summary className="cursor-pointer text-sm font-medium">
          TikTok Live (ตอนเริ่มไลฟ์)
        </summary>
        <p className="mt-2 text-xs text-tsz-muted">
          หลังเชื่อมห้องแล้ว ใส่ชื่อ TikTok ในโปรแกรม Connector หรือใช้ปุ่มด้านล่างถ้าเว็บเรียก localhost ได้
        </p>
        <input
          className="mt-2 w-full rounded-lg border border-tsz-border px-3 py-2 text-sm"
          placeholder="ชื่อผู้ใช้ TikTok"
          value={tiktok}
          onChange={(e) => setTiktok(e.target.value)}
        />
      </details>

      <SetupChecklist roomId={room.roomId} refreshKey={refreshKey} />

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-5 shadow-card">
        <h2 className="mb-2 text-base font-semibold">ขั้นถัดไป — OBS</h2>
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
        onClick={() => setShowAdvanced((s) => !s)}
      >
        {showAdvanced ? 'ซ่อน' : 'แสดง'}การเชื่อมแบบเดิม (localhost)
      </button>
      {showAdvanced && (
        <section className="rounded-lg border border-dashed border-tsz-border p-4">
          <p className="mb-3 text-xs text-tsz-muted">
            ใช้เมื่อเปิดเว็บบนเครื่องเดียวกับ Connector และอนุญาต Local network
          </p>
          <button
            type="button"
            disabled={busy || !room.user || !canReachLocalConnector()}
            className="w-full rounded-lg bg-tsz-accent px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={() => void connectViaLocalhost()}
          >
            {busy ? step || 'กำลังเชื่อม…' : 'เชื่อมต่อทั้งหมด (localhost)'}
          </button>
          {msg && !paired && (
            <p className="mt-2 text-center text-xs text-amber-900">{msg}</p>
          )}
        </section>
      )}
    </div>
  );
}
