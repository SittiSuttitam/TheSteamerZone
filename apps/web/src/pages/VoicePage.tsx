import { Link } from 'react-router-dom';

export function VoicePage() {
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="rounded-2xl border border-tsz-border bg-tsz-surface p-10 shadow-card">
        <p className="text-4xl" aria-hidden>
          🔊
        </p>
        <h1 className="mt-4 text-2xl font-semibold">เสียง & TTS</h1>
        <p className="mt-2 inline-block rounded-full bg-tsz-accent/10 px-3 py-1 text-sm font-medium text-tsz-accent">
          เร็วๆ นี้
        </p>
        <p className="mt-4 text-sm text-tsz-muted">
          ตอนนี้ใช้โปรแกรม Connector + หน้า Widgets ตามขั้นตอนใน{' '}
          <Link to="/app/connection" className="text-tsz-accent underline">
            เริ่มใช้งาน
          </Link>
        </p>
      </div>
    </div>
  );
}
