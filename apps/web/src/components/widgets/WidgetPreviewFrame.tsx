import type { ReactNode } from 'react';

type Props = {
  label: string;
  obsSize: string;
  children: ReactNode;
  minHeight?: number;
};

export function WidgetPreviewFrame({ label, obsSize, children, minHeight = 200 }: Props) {
  return (
    <section className="relative overflow-hidden rounded-t-xl border-b border-tsz-border bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950">
      <header className="flex items-center gap-2 border-b border-white/10 bg-black/50 px-3 py-2">
        <div className="flex gap-1" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <span className="truncate text-[10px] font-medium tracking-wide text-white/70">
          OBS · Browser Source
        </span>
        <span className="ml-auto shrink-0 text-[10px] text-white/40">{obsSize}</span>
      </header>

      <div
        className="relative flex items-center justify-center overflow-hidden p-3"
        style={{ minHeight }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(45deg,#888 25%,transparent 25%),linear-gradient(-45deg,#888 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#888 75%),linear-gradient(-45deg,transparent 75%,#888 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
          }}
          aria-hidden
        />
        <div className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/50">
          {label}
        </div>
        <div className="relative z-10 w-full">{children}</div>
      </div>
    </section>
  );
}

