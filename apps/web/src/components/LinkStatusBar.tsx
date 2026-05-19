import { useEffect, useRef, useState } from 'react';
import { connectorUrl, api } from '../lib/connector';

type SetupPayload = {
  webLinked?: boolean;
  roomConfigured?: boolean;
  tiktokConnected?: boolean;
  roomCode?: string | null;
  ready?: boolean;
  cloudSync?: boolean;
  cloudSyncError?: string | null;
};

type HealthPayload = {
  ok?: boolean;
  desktopAppOpen?: boolean;
  setup?: SetupPayload;
};

export function LinkStatusBar({
  refreshKey = 0,
  onStatus,
}: {
  refreshKey?: number;
  onStatus?: (s: { programOn: boolean; webLinked: boolean }) => void;
}) {
  const [programOn, setProgramOn] = useState(false);
  const [backendOn, setBackendOn] = useState(false);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      api<HealthPayload>(`${connectorUrl()}/health`)
        .then((h) => {
          if (cancelled) return;
          const desktop = !!h.desktopAppOpen;
          const linked = !!h.setup?.webLinked;
          setBackendOn(!!h.ok);
          setProgramOn(desktop);
          setSetup(h.setup ?? null);
          onStatusRef.current?.({ programOn: desktop, webLinked: linked });
        })
        .catch(() => {
          if (cancelled) return;
          setBackendOn(false);
          setProgramOn(false);
          setSetup(null);
          onStatusRef.current?.({ programOn: false, webLinked: false });
        });
    };
    tick();
    const id = window.setInterval(tick, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [refreshKey]);

  const webLinked = !!setup?.webLinked;
  const wasConfigured = !!setup?.roomConfigured;
  const tiktok = !!setup?.tiktokConnected;

  return (
    <section
      className={`rounded-xl border p-4 shadow-card ${
        webLinked
          ? 'border-green-300 bg-green-50/80'
          : programOn
            ? 'border-amber-300 bg-amber-50/60'
            : 'border-tsz-border bg-tsz-surface'
      }`}
      aria-live="polite"
    >
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-sm font-medium">
        <span
          className={`rounded-full px-3 py-1 ${
            programOn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          โปรแกรม {programOn ? '● เปิดอยู่' : '○ ปิด'}
        </span>
        <span className="text-tsz-muted" aria-hidden>
          ⟷
        </span>
        <span
          className={`rounded-full px-3 py-1 ${
            webLinked ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
          }`}
        >
          เว็บ {webLinked ? '● เชื่อมแล้ว' : '○ ยังไม่เชื่อม'}
        </span>
        {tiktok && programOn && (
          <>
            <span className="text-tsz-muted">·</span>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-900">
              TikTok ● ไลฟ์
            </span>
          </>
        )}
      </div>
      {webLinked && setup?.roomCode && (
        <p className="text-center text-xs text-tsz-muted">
          รหัสห้อง{' '}
          <strong className="font-mono text-base text-tsz-text">{setup.roomCode}</strong>
        </p>
      )}
      {!programOn && (
        <p className="mt-2 text-center text-xs text-amber-900">
          {backendOn && wasConfigured
            ? 'ปิดโปรแกรมแล้ว — เปิด TheSteamerZone Connector แล้วกดเชื่อมต่ออีกครั้ง'
            : 'เปิดโปรแกรม TheSteamerZone Connector บนเครื่องก่อน'}
        </p>
      )}
      {programOn && !webLinked && (
        <p className="mt-2 text-center text-xs text-amber-900">
          กดปุ่ม「เชื่อมต่อทั้งหมด」ด้านล่าง
        </p>
      )}
      {programOn && webLinked && setup?.cloudSync === false && (
        <p className="mt-2 text-center text-xs text-red-800">
          {setup.cloudSyncError ||
            'ซิงก์ OBS ยังไม่ได้ — ล็อกอินใหม่แล้วกด「เชื่อมต่อทั้งหมด」อีกครั้ง'}
        </p>
      )}
      {setup?.ready && programOn && (
        <p className="mt-2 text-center text-sm font-medium text-green-700">
          พร้อมไลฟ์ — เว็บกับโปรแกรมทำงานร่วมกันแล้ว
        </p>
      )}
    </section>
  );
}
