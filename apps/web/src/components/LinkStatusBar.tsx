import { useEffect, useRef, useState } from 'react';
import {
  canReachLocalConnector,
  connectorApi,
} from '../lib/connector';
import { useCloudConnectorLink } from '../hooks/useCloudConnectorLink';

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
  roomId = '',
  refreshKey = 0,
  onStatus,
}: {
  roomId?: string;
  refreshKey?: number;
  onStatus?: (s: { programOn: boolean; webLinked: boolean }) => void;
}) {
  const cloud = useCloudConnectorLink(roomId);
  const useLocal = canReachLocalConnector();
  const [programOn, setProgramOn] = useState(false);
  const [webLinked, setWebLinked] = useState(false);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => {
    if (!useLocal) {
      const linked = cloud.linked;
      setProgramOn(linked);
      setWebLinked(linked);
      setSetup(null);
      onStatusRef.current?.({ programOn: linked, webLinked: linked });
      return;
    }
    let cancelled = false;
    const tick = async () => {
      const h = await connectorApi<HealthPayload>('/health');
      if (cancelled) return;
      if (!h) {
        setProgramOn(false);
        setWebLinked(false);
        setSetup(null);
        onStatusRef.current?.({ programOn: false, webLinked: false });
        return;
      }
      const desktop = !!h.desktopAppOpen;
      const linked = !!h.setup?.webLinked;
      setProgramOn(desktop);
      setWebLinked(linked);
      setSetup(h.setup ?? null);
      onStatusRef.current?.({ programOn: desktop, webLinked: linked });
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [refreshKey, useLocal, cloud.linked]);

  const tiktok = !!setup?.tiktokConnected;
  const displayLinked = useLocal ? webLinked : cloud.linked;
  const displayProgram = useLocal ? programOn : cloud.linked;

  return (
    <section
      className={`rounded-xl border p-4 shadow-card ${
        displayLinked
          ? 'border-green-300 bg-green-50/80'
          : displayProgram
            ? 'border-amber-300 bg-amber-50/60'
            : 'border-tsz-border bg-tsz-surface'
      }`}
      aria-live="polite"
    >
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-sm font-medium">
        <span
          className={`rounded-full px-3 py-1 ${
            displayProgram ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          โปรแกรม {displayProgram ? '● เชื่อมแล้ว' : '○ รอกรอกรหัส'}
        </span>
        <span className="text-tsz-muted" aria-hidden>
          ⟷
        </span>
        <span
          className={`rounded-full px-3 py-1 ${
            displayLinked ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
          }`}
        >
          ห้อง {displayLinked ? '● ตรงกัน' : '○ ยังไม่เชื่อม'}
        </span>
      </div>

      {!useLocal && !displayLinked && (
        <p className="text-center text-xs text-amber-900">
          เปิด Connector แล้วกรอก<strong> รหัสห้อง </strong>และ<strong> รหัสเชื่อม </strong>
          จากด้านล่าง
        </p>
      )}
      {displayLinked && setup?.roomCode && (
        <p className="mt-2 text-center text-xs text-tsz-muted">
          รหัสห้อง <strong className="font-mono">{setup.roomCode}</strong>
        </p>
      )}
      {displayLinked && !useLocal && (
        <p className="mt-2 text-center text-sm font-medium text-green-700">
          เชื่อมผ่านรหัสห้องแล้ว ✓
        </p>
      )}
      {useLocal && programOn && !webLinked && (
        <p className="mt-2 text-center text-xs text-amber-900">
          กรอกรหัสในโปรแกรม หรือใช้「เชื่อมต่อทั้งหมด」แบบ localhost
        </p>
      )}
      {tiktok && displayProgram && (
        <p className="mt-1 text-center text-xs text-sky-800">TikTok ● ไลฟ์</p>
      )}
    </section>
  );
}
