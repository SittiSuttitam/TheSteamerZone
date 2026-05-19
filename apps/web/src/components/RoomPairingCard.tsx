import { useState } from 'react';
import { formatPairingSecret, formatRoomCode } from '../lib/roomCode';

type Props = {
  roomId: string;
  widgetSecret: string;
  roomName?: string;
};

export function RoomPairingCard({ roomId, widgetSecret, roomName }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const roomCode = formatRoomCode(roomId);
  const pairingSecret = formatPairingSecret(widgetSecret);

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied('error');
    }
  }

  return (
    <section className="rounded-xl border-2 border-tsz-accent/40 bg-gradient-to-b from-tsz-accent/5 to-tsz-surface p-5 shadow-card">
      <h2 className="mb-1 text-base font-semibold">เชื่อมโปรแกรมบนเครื่อง</h2>
      <p className="mb-4 text-xs leading-relaxed text-tsz-muted">
        {roomName ? (
          <>
            ห้อง <strong className="text-tsz-text">{roomName}</strong> — เปิด{' '}
            <strong>TheSteamerZone Connector</strong> แล้วกรอกรหัสสองชุดนี้ให้ตรงกัน
          </>
        ) : (
          <>
            เปิด <strong>TheSteamerZone Connector</strong> แล้วกรอกรหัสด้านล่าง
          </>
        )}
      </p>

      <CodeRow
        label="รหัสห้อง"
        value={roomCode}
        hint="8 ตัว (มีขีดกลางได้)"
        onCopy={() => void copy('room', roomCode)}
        copied={copied === 'room'}
      />
      <CodeRow
        label="รหัสเชื่อม"
        value={pairingSecret}
        hint="8 ตัว — อย่าแชร์ให้คนอื่น"
        onCopy={() => void copy('secret', pairingSecret)}
        copied={copied === 'secret'}
        className="mt-3"
      />

      {copied === 'error' && (
        <p className="mt-2 text-xs text-amber-800">คัดลอกไม่ได้ — เลือกแล้ว Ctrl+C</p>
      )}

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs text-tsz-muted">
        <li>เปิดโปรแกรม Connector บน Windows</li>
        <li>กรอกรหัสห้อง + รหัสเชื่อม</li>
        <li>กด「เชื่อมห้อง」ในโปรแกรม</li>
        <li>กลับมาที่หน้านี้ — สถานะด้านบนจะเป็น「เชื่อมแล้ว»</li>
      </ol>
    </section>
  );
}

function CodeRow({
  label,
  value,
  hint,
  onCopy,
  copied,
  className = '',
}: {
  label: string;
  value: string;
  hint: string;
  onCopy: () => void;
  copied: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border border-tsz-border bg-white/80 px-3 py-2 ${className}`}
    >
      <div>
        <p className="text-[11px] text-tsz-muted">{label}</p>
        <p className="font-mono text-lg font-semibold tracking-wider">{value}</p>
        <p className="text-[10px] text-tsz-muted">{hint}</p>
      </div>
      <button
        type="button"
        className="rounded-lg border border-tsz-border px-3 py-1.5 text-xs font-medium hover:bg-tsz-bg"
        onClick={onCopy}
      >
        {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}
      </button>
    </div>
  );
}
