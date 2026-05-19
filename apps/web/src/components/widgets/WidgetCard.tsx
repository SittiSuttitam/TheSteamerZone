import { useMemo, useState } from 'react';
import type { WidgetCatalogItem } from '../../lib/widgetCatalog';
import { WidgetPreviewFrame } from './WidgetPreviewFrame';
import { WidgetMockPreview, useMockPreview } from './WidgetMockPreview';

type Props = {
  item: WidgetCatalogItem;
  url: string;
  canPreview: boolean;
  showInlinePreview: boolean;
  copied: boolean;
  onCopy: () => void;
  onExpand: () => void;
};

const PREVIEW_BOX_W = 340;
const PREVIEW_MIN_H = 220;

export function WidgetCard({
  item,
  url,
  canPreview,
  showInlinePreview,
  copied,
  onCopy,
  onExpand,
}: Props) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const mock = useMockPreview(item.slug);

  const scale = useMemo(() => {
    if (mock) return 1;
    return Math.min(1, (PREVIEW_BOX_W - 24) / item.previewW);
  }, [item.previewW, mock]);

  const iframeH = mock ? 0 : Math.ceil(item.previewH * scale);

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-xl border bg-tsz-surface shadow-card transition ${
        item.ready ? 'border-tsz-border' : 'border-dashed border-tsz-border/70 opacity-90'
      }`}
    >
      {showInlinePreview && canPreview && item.ready && (
        <WidgetPreviewFrame label={item.label} obsSize={item.obsSize} minHeight={PREVIEW_MIN_H}>
          {mock ? (
            <WidgetMockPreview item={item} />
          ) : (
            <div className="relative mx-auto" style={{ width: PREVIEW_BOX_W, height: iframeH + 8 }}>
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-white/50">
                  กำลังโหลดตัวอย่าง…
                </div>
              )}
              <div className="flex justify-center overflow-hidden rounded-lg border border-white/10 bg-black/30 shadow-inner">
                <iframe
                  title={`ตัวอย่าง ${item.label}`}
                  src={url}
                  className="pointer-events-none border-0"
                  style={{
                    width: item.previewW,
                    height: item.previewH,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                  }}
                  onLoad={() => setIframeLoaded(true)}
                />
              </div>
            </div>
          )}
        </WidgetPreviewFrame>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="text-2xl" aria-hidden>
            {item.emoji}
          </span>
          {item.ready ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
              พร้อมใช้
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
              เร็วๆ นี้
            </span>
          )}
        </div>

        <h3 className="font-semibold text-tsz-text">{item.label}</h3>
        <p className="mt-1 flex-1 text-xs leading-relaxed text-tsz-muted">{item.description}</p>

        <div className="mt-3 rounded-lg bg-tsz-bg/80 px-2 py-1.5 text-[10px] text-tsz-muted">
          <div>
            <strong className="text-tsz-text">OBS:</strong> {item.obsSize}
          </div>
          {item.obsWidth && item.obsHeight && (
            <div>
              ตั้งขนาด Browser Source = {item.obsWidth} × {item.obsHeight}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!item.ready || !canPreview}
            className="rounded-lg border border-tsz-border px-3 py-1.5 text-xs font-medium hover:bg-tsz-bg disabled:opacity-40"
            onClick={onExpand}
          >
            ขยายเต็มจอ
          </button>
          <button
            type="button"
            disabled={!item.ready || !canPreview}
            className="rounded-lg bg-tsz-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            onClick={onCopy}
          >
            {copied ? 'คัดลอกแล้ว ✓' : '📋 Copy URL'}
          </button>
        </div>
      </div>
    </article>
  );
}
