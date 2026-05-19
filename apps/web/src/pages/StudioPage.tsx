import { useEffect, useMemo, useState } from 'react';

const LS_ROOM = 'tsz_room_id';
const LS_TOKEN = 'tsz_widget_token';

function baseUrl() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export function StudioPage() {
  const [roomId, setRoomId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(LS_ROOM) || '';
  });
  const [widgetToken, setWidgetToken] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(LS_TOKEN) || '';
  });

  useEffect(() => {
    const v = roomId.trim();
    if (v) localStorage.setItem(LS_ROOM, v);
    else localStorage.removeItem(LS_ROOM);
  }, [roomId]);

  useEffect(() => {
    const v = widgetToken.trim();
    if (v) localStorage.setItem(LS_TOKEN, v);
    else localStorage.removeItem(LS_TOKEN);
  }, [widgetToken]);

  const q = widgetToken.trim() ? `?token=${encodeURIComponent(widgetToken.trim())}` : '';

  const links = useMemo(
    () => [
      { label: 'ชนะ / Win', path: `/w/${roomId || 'YOUR_ROOM_UUID'}/win`, size: 'ยืดหยุ่น' },
      { label: 'วงล้อ', path: `/w/${roomId || 'YOUR_ROOM_UUID'}/wheel`, size: '800×200' },
      { label: 'TTS / อ่านออกเสียง', path: `/w/${roomId || 'YOUR_ROOM_UUID'}/tts`, size: '1×1 (ซ่อน)' },
      { label: 'Likes', path: `/w/${roomId || 'YOUR_ROOM_UUID'}/likes`, size: '800×600' },
      { label: 'Top coin', path: `/w/${roomId || 'YOUR_ROOM_UUID'}/topcoin`, size: '800×600' },
      { label: 'Top viewers', path: `/w/${roomId || 'YOUR_ROOM_UUID'}/topviewers`, size: '800×600' },
      { label: 'Top donate', path: `/w/${roomId || 'YOUR_ROOM_UUID'}/topdonate`, size: '800×600' },
      { label: 'Image', path: `/w/${roomId || 'YOUR_ROOM_UUID'}/image`, size: '800×600' },
      { label: 'Activity', path: `/w/${roomId || 'YOUR_ROOM_UUID'}/activity`, size: '420×280' },
      { label: 'Chat', path: `/w/${roomId || 'YOUR_ROOM_UUID'}/chat`, size: 'ยืดหยุ่น' },
    ],
    [roomId]
  );

  function copyFullUrl(path: string) {
    const full = `${baseUrl()}${path}${q}`;
    void navigator.clipboard.writeText(full);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">สตูดิโอ OBS</h1>
      <p className="mb-6 text-sm leading-relaxed text-tsz-muted">
        คัดลอก URL สำหรับ «แหล่งที่มาเบราว์เซอร์» ใน OBS ใส่ <code className="rounded bg-tsz-bg px-1">rooms.id</code> จาก
        Supabase และ <code className="rounded bg-tsz-bg px-1">widget_secret</code> ของห้อง
      </p>

      <div className="mb-6 grid gap-4 rounded-xl border border-tsz-border bg-tsz-surface p-6 shadow-card sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-tsz-muted">รหัสห้อง (room id)</label>
          <input
            className="w-full rounded-lg border border-tsz-border px-3 py-2 font-mono text-sm"
            placeholder="UUID จากตาราง rooms"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-tsz-muted">Widget secret (token)</label>
          <input
            className="w-full rounded-lg border border-tsz-border px-3 py-2 font-mono text-sm"
            type="password"
            autoComplete="off"
            placeholder="จาก Supabase หรือที่คุณตั้งไว้"
            value={widgetToken}
            onChange={(e) => setWidgetToken(e.target.value)}
          />
        </div>
      </div>

      {!roomId.trim() && (
        <p className="mb-4 text-sm text-amber-800">
          ยังไม่ได้ใส่รหัสห้อง — ลิงก์ด้านล่างจะแสดงตัวยึด <code className="rounded bg-amber-100 px-1">YOUR_ROOM_UUID</code>
        </p>
      )}
      {!widgetToken.trim() && (
        <p className="mb-4 text-sm text-amber-800">
          ยังไม่ได้ใส่ token — ลิงก์จะไม่มีพารามิเตอร์ <code className="rounded bg-amber-100 px-1">?token=</code> (บางวิดเจ็ตต้องมี)
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-tsz-border bg-tsz-surface shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-tsz-border bg-tsz-bg/50 text-tsz-muted">
            <tr>
              <th className="px-4 py-3 font-medium">วิดเจ็ต</th>
              <th className="px-4 py-3 font-medium">ขนาดแนะนำ</th>
              <th className="px-4 py-3 font-medium">คัดลอก URL</th>
            </tr>
          </thead>
          <tbody>
            {links.map((row) => (
              <tr key={row.path} className="border-b border-tsz-border/80 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-tsz-text">{row.label}</div>
                  <div className="mt-1 break-all font-mono text-xs text-tsz-muted">
                    {row.path}
                    {q || ' (ใส่ token ด้านบน)'}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-tsz-muted">{row.size}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    className="rounded-lg border border-tsz-border px-3 py-1 text-xs text-tsz-accent hover:bg-tsz-bg"
                    onClick={() => copyFullUrl(row.path)}
                  >
                    คัดลอก
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
