import { useMemo, useState } from 'react';
import { ConnectToProgram } from '../components/ConnectToProgram';
import { SoundSettingsPanel } from '../components/SoundSettingsPanel';
import { WidgetTestPanel } from '../components/WidgetTestPanel';
import { WidgetPreviewModal } from '../components/WidgetPreviewModal';
import { WidgetCard } from '../components/widgets/WidgetCard';
import { useRoomCredentials } from '../hooks/useRoomCredentials';
import {
  WIDGET_CATALOG,
  WIDGET_CATEGORIES,
  readyWidgetCount,
  widgetsInCategory,
  type WidgetCatalogItem,
} from '../lib/widgetCatalog';

type Filter = 'all' | 'ready' | 'soon';

export function WidgetsPage() {
  const room = useRoomCredentials();
  const [copied, setCopied] = useState<string | null>(null);
  const [preview, setPreview] = useState<WidgetCatalogItem | null>(null);
  const [showPreviews, setShowPreviews] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [obsGuideOpen, setObsGuideOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'ready') return WIDGET_CATALOG.filter((w) => w.ready);
    if (filter === 'soon') return WIDGET_CATALOG.filter((w) => !w.ready);
    return WIDGET_CATALOG;
  }, [filter]);

  function copyUrl(slug: string) {
    void navigator.clipboard.writeText(room.widgetUrl(slug));
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  const previewUrl = preview ? room.widgetUrl(preview.slug) : '';

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Widgets</h1>
          <p className="mt-1 text-sm text-tsz-muted">
            วิดเจ็ตทั้งหมดของ TheSteamerZone — ดูตัวอย่างก่อนคัดลอกไปใส่ OBS / TikTok Studio
          </p>
          <p className="mt-1 text-xs text-tsz-muted">
            พร้อมใช้ {readyWidgetCount()}/{WIDGET_CATALOG.length} รายการ
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-tsz-border bg-tsz-surface px-3 py-2 text-sm shadow-card">
          <input
            type="checkbox"
            checked={showPreviews}
            onChange={(e) => setShowPreviews(e.target.checked)}
            className="h-4 w-4"
          />
          แสดงตัวอย่างในการ์ด
        </label>
      </div>

      {/* ห้อง */}
      <section className="mb-6 rounded-xl border border-tsz-border bg-tsz-surface p-5 shadow-card">
        <h2 className="mb-2 text-sm font-semibold">ห้องของคุณ (ลิงก์วิดเจ็ต)</h2>
        <p className="mb-3 text-xs text-tsz-muted">
          กดโหลดห้องครั้งเดียว — ทุกวิดเจ็ตด้านล่างจะใช้ URL เดียวกันอัตโนมัติ
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {room.supabaseConfigured && room.user ? (
            <button
              type="button"
              disabled={room.roomBusy}
              className="rounded-lg bg-tsz-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => void room.loadRoomFromAccount()}
            >
              {room.roomBusy ? 'กำลังโหลด…' : 'โหลดห้องจากบัญชี'}
            </button>
          ) : (
            <span className="text-sm text-amber-800">ล็อกอิน Google ก่อน</span>
          )}
          {room.ready && (
            <span className="text-xs text-green-700">✓ พร้อมแสดงตัวอย่างและคัดลอก URL</span>
          )}
        </div>
        {room.roomMsg && <p className="mt-2 text-xs text-tsz-muted">{room.roomMsg}</p>}
        {room.ready && (
          <div className="mt-4">
            <ConnectToProgram roomId={room.roomId} />
          </div>
        )}
        {!room.ready && (
          <p className="mt-2 text-xs text-amber-800">
            ยังไม่มีห้อง — ตัวอย่างจะไม่โหลด (กดโหลดห้องด้านบน)
          </p>
        )}
        <button
          type="button"
          className="mt-3 text-xs text-tsz-accent underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? 'ซ่อน room id / token' : 'แสดง room id / token'}
        </button>
        {showAdvanced && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-lg border border-tsz-border px-3 py-2 font-mono text-xs"
              value={room.roomId}
              onChange={(e) => room.setRoomId(e.target.value)}
              placeholder="room uuid"
            />
            <input
              type="password"
              className="rounded-lg border border-tsz-border px-3 py-2 font-mono text-xs"
              value={room.widgetToken}
              onChange={(e) => room.setWidgetToken(e.target.value)}
              placeholder="widget token"
            />
          </div>
        )}
      </section>

      <SoundSettingsPanel />
      <WidgetTestPanel roomReady={room.ready} />

      {/* วิธี OBS */}
      <section className="mb-6 rounded-xl border border-blue-200/70 bg-blue-50/50 shadow-card">
        <button
          type="button"
          className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold"
          onClick={() => setObsGuideOpen((o) => !o)}
        >
          <span>📌 วิธีใส่ใน OBS / TikTok Studio</span>
          <span>{obsGuideOpen ? '▼' : '▶'}</span>
        </button>
        {obsGuideOpen && (
          <ol className="list-decimal space-y-2 border-t border-blue-200/50 px-5 py-4 text-sm leading-relaxed text-tsz-muted">
            <li>Login แล้วกด <strong>โหลดห้องจากบัญชี</strong></li>
            <li>เลือกวิดเจ็ต → ดูตัวอย่าง → กด <strong>Copy URL</strong></li>
            <li>
              OBS: Sources → Browser → วาง URL → ตั้ง Width × Height ตามที่การ์ดบอก
            </li>
            <li>TikTok Studio: Add Source → Link → วาง URL</li>
          </ol>
        )}
      </section>

      {/* ฟิลเตอร์ */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ['all', 'ทั้งหมด'],
            ['ready', 'พร้อมใช้'],
            ['soon', 'เร็วๆ นี้'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              filter === id
                ? 'bg-tsz-accent text-white'
                : 'border border-tsz-border bg-tsz-surface text-tsz-muted hover:bg-tsz-bg'
            }`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* รายการตามหมวด */}
      {WIDGET_CATEGORIES.map((cat) => {
        const items = widgetsInCategory(cat.id).filter((w) =>
          filtered.some((f) => f.slug === w.slug)
        );
        if (!items.length) return null;

        return (
          <section key={cat.id} className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <span>{cat.emoji}</span>
              {cat.label}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {items.map((item) => (
                <WidgetCard
                  key={item.slug}
                  item={item}
                  url={room.widgetUrl(item.slug)}
                  canPreview={room.ready}
                  showInlinePreview={showPreviews}
                  copied={copied === item.slug}
                  onCopy={() => copyUrl(item.slug)}
                  onExpand={() => setPreview(item)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {preview && (
        <WidgetPreviewModal
          item={preview}
          previewUrl={previewUrl}
          onClose={() => setPreview(null)}
          onCopy={() => copyUrl(preview.slug)}
        />
      )}
    </div>
  );
}
