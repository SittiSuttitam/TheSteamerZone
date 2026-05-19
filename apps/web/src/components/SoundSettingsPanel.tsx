import { useCallback, useEffect, useRef, useState } from 'react';
import {
  canReachLocalConnector,
  connectorApi,
  connectorUrl,
  api,
  isRemoteHttpsDashboard,
} from '../lib/connector';
import { playWidgetSound } from '../lib/playWidgetSound';

type SoundConfig = {
  files: string[];
  incrementFile: string;
  decrementFile: string;
  volume: number;
};

export function SoundSettingsPanel() {
  const base = connectorUrl();
  const fileRef = useRef<HTMLInputElement>(null);
  const [cfg, setCfg] = useState<SoundConfig | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remoteOnly = isRemoteHttpsDashboard() && !canReachLocalConnector();

  const load = useCallback(async () => {
    if (!canReachLocalConnector()) {
      setCfg(null);
      return;
    }
    const data = await connectorApi<SoundConfig>('/api/config/sounds');
    setCfg(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadFile(file: File) {
    if (!canReachLocalConnector()) {
      setMsg('เปิด Connector บนเครื่องและอนุญาต Local network ก่อนอัปโหลด');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'));
        r.readAsDataURL(file);
      });
      await api<{ ok: boolean; filename: string }>(`${base}/api/sounds/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, dataUrl }),
      });
      setMsg(`อัปโหลด ${file.name} แล้ว`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  async function savePatch(patch: Partial<SoundConfig>) {
    setBusy(true);
    try {
      await api(`${base}/api/config/sounds`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cfg, ...patch }),
      });
      setMsg('บันทึกการตั้งค่าเสียงแล้ว');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  const files = cfg?.files ?? [];

  return (
    <section className="mb-8 rounded-xl border border-tsz-border bg-tsz-surface p-5 shadow-card">
      <h2 className="mb-1 text-lg font-semibold">🔊 ไลบรารีเสียง</h2>
      <p className="mb-4 text-xs text-tsz-muted">
        อัปโหลด MP3/WAV แล้วเลือกใช้กับ +/− WIN หรือ VIP — เล่นผ่าน Widget{' '}
        <code className="rounded bg-tsz-bg px-1">/sound</code> ใน OBS
      </p>

      {remoteOnly && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          จากเว็บ Vercel จัดการไฟล์เสียงบน Connector โดยตรงไม่ได้ — เปิดโปรแกรม Connector
          บนเครื่อง แล้วกด「เชื่อมต่อทั้งหมด」 (Chrome อาจถามอนุญาตเครือข่ายภายใน)
        </p>
      )}

      {msg && (
        <p className="mb-3 rounded-lg bg-tsz-bg px-3 py-2 text-sm text-tsz-muted">{msg}</p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={busy || remoteOnly}
          className="rounded-lg bg-tsz-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => fileRef.current?.click()}
        >
          {busy ? 'กำลังอัปโหลด…' : 'อัปโหลดเสียง'}
        </button>
        <label className="flex items-center gap-2 text-sm text-tsz-muted">
          ระดับเสียง
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((cfg?.volume ?? 0.7) * 100)}
            onChange={(e) =>
              setCfg((c) =>
                c ? { ...c, volume: Number(e.target.value) / 100 } : c
              )
            }
            onMouseUp={() => void savePatch({ volume: cfg?.volume })}
            onTouchEnd={() => void savePatch({ volume: cfg?.volume })}
          />
        </label>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">เสียงเมื่อ +1 (WIN)</span>
          <select
            className="w-full rounded-lg border border-tsz-border px-2 py-2 text-sm"
            value={cfg?.incrementFile ?? 'increment.mp3'}
            onChange={(e) => void savePatch({ incrementFile: e.target.value })}
          >
            {files.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">เสียงเมื่อ −1 (WIN)</span>
          <select
            className="w-full rounded-lg border border-tsz-border px-2 py-2 text-sm"
            value={cfg?.decrementFile ?? 'decrement.mp3'}
            onChange={(e) => void savePatch({ decrementFile: e.target.value })}
          >
            {files.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-tsz-border bg-tsz-bg/50 p-2">
        {files.length === 0 && (
          <li className="px-2 py-4 text-center text-xs text-tsz-muted">
            ยังไม่มีไฟล์ — อัปโหลดด้านบน
          </li>
        )}
        {files.map((f) => (
          <li
            key={f}
            className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm"
          >
            <span className="truncate font-mono text-xs">{f}</span>
            <button
              type="button"
              className="shrink-0 rounded border border-tsz-border px-2 py-1 text-xs hover:bg-tsz-bg"
              onClick={() =>
                playWidgetSound({ file: f, volume: cfg?.volume ?? 0.7 })
              }
            >
              ▶ ฟัง
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}



