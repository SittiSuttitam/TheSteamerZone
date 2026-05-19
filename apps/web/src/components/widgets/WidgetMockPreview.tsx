import type { WidgetCatalogItem } from '../../lib/widgetCatalog';

type Props = { item: WidgetCatalogItem };

export function WidgetMockPreview({ item }: Props) {
  switch (item.slug) {
    case 'sound':
      return (
        <div className="mx-auto flex max-w-[280px] flex-col items-center gap-3 rounded-xl border border-white/15 bg-gradient-to-b from-indigo-950/90 to-zinc-900/90 px-6 py-5 shadow-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tsz-accent/20 text-4xl ring-2 ring-tsz-accent/40">
            🔊
          </div>
          <p className="text-center text-sm font-medium text-white">Widget เสียง</p>
          <p className="text-center text-[11px] leading-relaxed text-white/60">
            วางใน OBS ขนาด 1×1 px — เล่นเสียง +/− WIN และ VIP อัตโนมัติ
          </p>
          <div className="flex h-8 w-full items-end justify-center gap-0.5" aria-hidden>
            {[3, 6, 4, 8, 5, 7, 4, 6, 3].map((h, i) => (
              <span
                key={i}
                className="w-1 animate-pulse rounded-sm bg-tsz-accent/80"
                style={{ height: `${h * 3}px`, animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        </div>
      );

    case 'tts':
      return (
        <div className="mx-auto max-w-xs rounded-xl border border-dashed border-white/20 bg-zinc-800/80 px-4 py-6 text-center">
          <span className="text-3xl">🔊</span>
          <p className="mt-2 text-sm text-white/80">TTS — เร็วๆ นี้</p>
        </div>
      );

    case 'topdonate':
    case 'topcoin':
    case 'likes':
    case 'topviewers':
      return (
        <div className="mx-auto w-full max-w-[240px] rounded-lg border border-white/10 bg-black/40 p-3 text-left">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
            {item.emoji} {item.label}
          </p>
          {[1, 2, 3].map((n) => (
            <div key={n} className="mb-1.5 flex items-center gap-2 text-xs text-white/80">
              <span className="w-4 text-amber-300">#{n}</span>
              <span className="h-5 w-5 rounded-full bg-white/20" />
              <span className="flex-1 truncate">ผู้ใช้ตัวอย่าง</span>
              <span className="text-white/50">···</span>
            </div>
          ))}
          <p className="mt-2 text-center text-[10px] text-white/40">เร็วๆ นี้</p>
        </div>
      );

    default:
      return null;
  }
}

/** วิดเจ็ตที่ iframe แทบมองไม่เห็น — ใช้ mock แทน */
export function useMockPreview(slug: string): boolean {
  return slug === 'sound' || slug === 'tts' || slug.startsWith('top');
}

