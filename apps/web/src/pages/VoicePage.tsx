import { Link } from 'react-router-dom';

export function VoicePage() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-tsz-border bg-tsz-surface p-10 shadow-card">
        <p className="text-center text-4xl" aria-hidden>
          🔊
        </p>
        <h1 className="mt-4 text-center text-2xl font-semibold">เสียง & TTS</h1>
        <p className="mt-4 text-sm leading-relaxed text-tsz-muted">
          ตั้งเสียง WIN / VIP ได้ที่หน้า{' '}
          <Link to="/app/widgets" className="text-tsz-accent underline">
            Widgets
          </Link>
          {' '}(แผงทดสอบด้านล่าง)
        </p>
        <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-tsz-muted">
          <li>วิดเจ็ต <strong className="text-tsz-text">เสียง</strong> — Copy URL ไป OBS ขนาด 1×1</li>
          <li>
            วิดเจ็ต <strong className="text-tsz-text">TTS</strong> — Copy URL ไป OBS ขนาด 1×1
          </li>
          <li>กดทดสอบ TTS / Mock gift ในหน้า Widgets (ต้องเปิด Connector)</li>
        </ol>
        <p className="mt-6 text-center text-xs text-tsz-muted">
          การตั้งค่า Google TTS ขั้นสูงยังอยู่ใน Connector — หน้านี้จะขยายในอัปเดตถัดไป
        </p>
      </div>
    </div>
  );
}
