import { useEffect, useState } from 'react';
import { connectorUrl, api } from '../lib/connector';

const LS_CONNECTOR = 'thesteamerzone_connector_url';

export function ConnectionPage() {
  const [health, setHealth] = useState<unknown>(null);
  const [connectorInput, setConnectorInput] = useState(
    () =>
      (typeof window !== 'undefined' && localStorage.getItem(LS_CONNECTOR)) ||
      import.meta.env.VITE_CONNECTOR_URL ||
      'http://127.0.0.1:8780'
  );
  const [savedHint, setSavedHint] = useState(false);
  const [tiktok, setTiktok] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ping, setPing] = useState(0);
  const [winState, setWinState] = useState<{ win: number; winLabel?: string } | null>(
    null
  );

  async function winAction(path: 'increment' | 'decrement' | 'reset') {
    setErr(null);
    try {
      const s = await api<{ win: number; winLabel?: string }>(
        `${connectorUrl()}/api/win/${path}`,
        { method: 'POST' }
      );
      setWinState(s);
      setPing((n) => n + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    setErr(null);
    api(`${connectorUrl()}/health`)
      .then(setHealth)
      .catch((e: Error) => setErr(e.message));
    api<{ win: number; winLabel?: string }>(`${connectorUrl()}/api/state`)
      .then(setWinState)
      .catch(() => setWinState(null));
  }, [ping]);

  function persistConnectorUrl() {
    const v = connectorInput.trim().replace(/\/$/, '');
    if (v && v !== 'http://127.0.0.1:8780') {
      localStorage.setItem(LS_CONNECTOR, v);
    } else if (!connectorInput.trim()) {
      localStorage.removeItem(LS_CONNECTOR);
    } else {
      localStorage.setItem(LS_CONNECTOR, v);
    }
    setSavedHint(true);
    setTimeout(() => setSavedHint(false), 2000);
    setPing((n) => n + 1);
  }

  async function connectTiktok() {
    setErr(null);
    try {
      await api(`${connectorUrl()}/api/tiktok/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: tiktok }),
      });
      const h = await api(`${connectorUrl()}/health`);
      setHealth(h);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">เชื่อมต่อ</h1>
        <p className="text-sm leading-relaxed text-tsz-muted">
          เริ่มจากตรงนี้: ตั้งค่าโปรแกรม Connector บนเครื่องคุณ แล้วเชื่อม TikTok Live
        </p>
      </div>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-6 shadow-card">
        <h2 className="mb-1 text-sm font-medium text-tsz-text">ที่อยู่ Local Connector</h2>
        <p className="mb-3 text-xs text-tsz-muted">
          ค่าที่ใช้งานจริง:{' '}
          <code className="rounded bg-tsz-bg px-1">{connectorUrl()}</code> — บันทึกแล้วจะเก็บในเบราว์เซอร์
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="min-w-0 flex-1 rounded-lg border border-tsz-border px-3 py-2 text-sm"
            placeholder="http://127.0.0.1:8780"
            value={connectorInput}
            onChange={(e) => setConnectorInput(e.target.value)}
          />
          <button
            type="button"
            className="rounded-lg bg-tsz-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            onClick={() => persistConnectorUrl()}
          >
            บันทึกและทดสอบ
          </button>
        </div>
        {savedHint && (
          <p className="mt-2 text-xs text-green-700">บันทึกแล้ว — กำลังตรวจสอบสถานะ…</p>
        )}
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-6 shadow-card">
        <h2 className="mb-1 text-sm font-medium text-tsz-text">คะแนน WIN</h2>
        <p className="mb-3 text-xs text-tsz-muted">
          ปรับคะแนนผ่าน Connector — overlay จะ sync เมื่อตั้ง Supabase Realtime
        </p>
        <p className="mb-3 text-3xl font-semibold tabular-nums text-tsz-text">
          {winState?.win ?? '—'}
          {winState?.winLabel ? (
            <span className="ml-2 text-sm font-normal text-tsz-muted">
              {winState.winLabel}
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-tsz-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            onClick={() => void winAction('increment')}
          >
            +1
          </button>
          <button
            type="button"
            className="rounded-lg border border-tsz-border px-4 py-2 text-sm hover:bg-tsz-bg"
            onClick={() => void winAction('decrement')}
          >
            −1
          </button>
          <button
            type="button"
            className="rounded-lg border border-tsz-border px-4 py-2 text-sm hover:bg-tsz-bg"
            onClick={() => void winAction('reset')}
          >
            รีเซ็ต
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-6 shadow-card">
        <h2 className="mb-3 text-sm font-medium text-tsz-muted">สถานะ Connector</h2>
        {err && <p className="mb-2 text-sm text-red-600">ไม่สามารถเชื่อมต่อได้: {err}</p>}
        <pre className="max-h-40 overflow-auto text-xs text-tsz-muted">
          {JSON.stringify(health, null, 2)}
        </pre>
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-6 shadow-card">
        <h2 className="mb-1 text-sm font-medium text-tsz-text">TikTok Live</h2>
        <p className="mb-3 text-xs text-tsz-muted">
          ใส่ชื่อผู้ใช้ห้องสตรีม (ไม่ต้องใส่ @) แล้วกดเชื่อม — ต้องรัน Connector บนเครื่องเดียวกัน
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-tsz-border px-3 py-2 text-sm"
            placeholder="ชื่อผู้ใช้ TikTok"
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
          />
          <button
            type="button"
            className="rounded-lg bg-tsz-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            onClick={() => void connectTiktok()}
          >
            เชื่อมต่อ TikTok
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-6 shadow-card">
        <h2 className="mb-1 text-sm font-medium text-tsz-text">ทดสอบวงล้อ</h2>
        <p className="mb-3 text-xs text-tsz-muted">
          เปิดวิดเจ็ตวงล้อใน OBS ก่อน จากนั้นกดทดสอบ — ต้องเปิดวงล้อใน gift-config (enabled) และตั้ง trigger gift
        </p>
        <button
          type="button"
          className="rounded-lg border border-tsz-border px-4 py-2 text-sm hover:bg-tsz-bg"
          onClick={() =>
            void api(`${connectorUrl()}/api/wheel/mock-spin`, { method: 'POST' }).catch(
              (e: Error) => setErr(e.message)
            )
          }
        >
          หมุนวงล้อทดสอบ
        </button>
      </section>
    </div>
  );
}
