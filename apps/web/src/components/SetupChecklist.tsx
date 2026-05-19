import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCloudConnectorLink } from '../hooks/useCloudConnectorLink';
import { canReachLocalConnector, connectorApi } from '../lib/connector';

type SetupStep = { id: string; label: string; ok: boolean; hint: string };
type SetupPayload = {
  steps?: SetupStep[];
  ready?: boolean;
  webLinked?: boolean;
};

export function SetupChecklist({
  roomId = '',
  refreshKey = 0,
}: {
  roomId?: string;
  refreshKey?: number;
}) {
  const { user, supabaseConfigured } = useAuth();
  const cloud = useCloudConnectorLink(roomId);
  const useLocal = canReachLocalConnector();
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [connectorOk, setConnectorOk] = useState(false);

  useEffect(() => {
    if (!canReachLocalConnector()) {
      setConnectorOk(false);
      setSetup(null);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      const h = await connectorApi<{ ok?: boolean; setup?: SetupPayload }>(
        '/health'
      );
      if (cancelled) return;
      if (!h) {
        setConnectorOk(false);
        setSetup(null);
        return;
      }
      setConnectorOk(!!h.ok);
      setSetup(h.setup ?? null);
    };
    void tick();
    const id = window.setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [refreshKey]);

  const items: SetupStep[] = setup?.steps?.length
    ? setup.steps
    : [
        {
          id: 'program',
          label: 'เปิดโปรแกรม Connector',
          ok: useLocal ? connectorOk : cloud.linked,
          hint: (useLocal ? connectorOk : cloud.linked)
            ? ''
            : 'เปิดโปรแกรมแล้วกรอกรหัสจากเว็บ',
        },
        {
          id: 'login',
          label: 'ล็อกอินเว็บ (Google)',
          ok: !!user && supabaseConfigured,
          hint: user ? '' : 'ปุ่มเข้าสู่ระบบมุมขวา',
        },
        {
          id: 'weblink',
          label: 'เว็บ ↔ โปรแกรม',
          ok: useLocal ? !!setup?.webLinked : cloud.linked,
          hint: useLocal ? 'กรอกรหัสในโปรแกรม หรือ localhost' : 'กรอกรหัสห้อง + รหัสเชื่อมในโปรแกรม',
        },
        {
          id: 'tiktok',
          label: 'TikTok Live (ตอนไลฟ์)',
          ok: false,
          hint: 'ขยายช่อง TikTok ในปุ่มเดียวด้านบน',
        },
      ];

  const done = items.filter((i) => i.ok).length;

  return (
    <section className="rounded-xl border border-tsz-border bg-tsz-surface p-5 shadow-card">
      <h2 className="mb-1 text-sm font-semibold">
        ความพร้อม ({done}/{items.length})
      </h2>
      {setup?.ready && (
        <p className="mb-3 text-sm font-medium text-green-700">พร้อมไลฟ์แล้ว</p>
      )}
      {setup?.webLinked && !setup?.ready && (
        <p className="mb-3 text-sm text-tsz-muted">เว็บกับโปรแกรมเชื่อมแล้ว — เหลือ TikTok ตอนไลฟ์</p>
      )}
      <ul className="space-y-2.5 text-sm">
        {items.map((row) => (
          <li key={row.id} className="flex gap-2">
            <span className={row.ok ? 'text-green-700' : 'text-amber-800'}>
              {row.ok ? '✓' : '○'}
            </span>
            <span>
              <span className="font-medium">{row.label}</span>
              {row.hint ? (
                <span className="block text-xs text-tsz-muted">{row.hint}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
