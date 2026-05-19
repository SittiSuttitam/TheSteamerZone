import { useEffect, useMemo, useState } from 'react';
import type { WidgetCatalogItem } from '../lib/widgetCatalog';
import { WidgetPreviewFrame } from './widgets/WidgetPreviewFrame';
import { WidgetMockPreview, useMockPreview } from './widgets/WidgetMockPreview';

type Props = {
  item: WidgetCatalogItem;
  previewUrl: string;
  onClose: () => void;
  onCopy: () => void;
};

export function WidgetPreviewModal({ item, previewUrl, onClose, onCopy }: Props) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const mock = useMockPreview(item.slug);
  const noRoom = previewUrl.includes('YOUR_ROOM');

  const scale = useMemo(() => {
    if (mock) return 1;
    const maxW = Math.min(window.innerWidth * 0.85, 720);
    const maxH = Math.min(window.innerHeight * 0.55, 480);
    return Math.min(1, maxW / item.previewW, maxH / item.previewH);
  }, [item.previewW, item.previewH, mock]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`ตัวอย่าง ${item.label}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-tsz-border bg-tsz-surface shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-tsz-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-tsz-text">
              {item.emoji} {item.label}
            </h2>
            <p className="mt-1 text-sm text-tsz-muted">{item.description}</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-tsz-border px-3 py-1 text-sm hover:bg-tsz-bg"
            onClick={onClose}
          >
            ปิด
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          {noRoom ? (
            <p className="p-10 text-center text-sm text-tsz-muted">
              กด «โหลดห้องจากบัญชี» ด้านบนก่อน แล้วค่อยดูตัวอย่าง
            </p>
          ) : (
            <WidgetPreviewFrame
              label={item.label}
              obsSize={item.obsSize}
              minHeight={mock ? 280 : Math.ceil(item.previewH * scale) + 48}
            >
              {mock ? (
                <WidgetMockPreview item={item} />
              ) : (
                <div className="relative mx-auto flex justify-center py-2">
                  {!iframeLoaded && (
                    <p className="absolute inset-0 flex items-center justify-center text-xs text-white/50">
                      กำลังโหลด…
                    </p>
                  )}
                  <iframe
                    title={item.label}
                    src={previewUrl}
                    className="rounded-lg border border-white/15 bg-black/40 shadow-2xl"
                    style={{
                      width: item.previewW,
                      height: item.previewH,
                      transform: `scale(${scale})`,
                      transformOrigin: 'top center',
                    }}
                    onLoad={() => setIframeLoaded(true)}
                  />
                </div>
              )}
            </WidgetPreviewFrame>
          )}
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-tsz-border px-5 py-4">
          <button
            type="button"
            className="rounded-lg bg-tsz-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            onClick={onCopy}
          >
            คัดลอก URL สำหรับ OBS
          </button>
          <button
            type="button"
            className="rounded-lg border border-tsz-border px-4 py-2 text-sm hover:bg-tsz-bg"
            onClick={onClose}
          >
            ปิด
          </button>
          <p className="w-full text-xs text-tsz-muted">
            ใน OBS: แหล่งที่มา → เบราว์เซอร์ → วาง URL · ขนาดแนะนำ {item.obsSize}
          </p>
        </footer>
      </div>
    </div>
  );
}
