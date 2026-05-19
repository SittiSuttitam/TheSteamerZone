type Props = {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
};

const sizes = {
  sm: { img: 40, title: 'text-lg', sub: 'text-[10px]' },
  md: { img: 56, title: 'text-xl', sub: 'text-xs' },
  lg: { img: 80, title: 'text-3xl', sub: 'text-sm' },
};

export function BrandLogo({ size = 'md', showSubtitle = true }: Props) {
  const s = sizes[size];

  return (
    <figure className="flex flex-col items-center text-center">
      <div
        className="mb-3 overflow-hidden rounded-2xl bg-white/10 shadow-lg ring-1 ring-white/20 backdrop-blur-sm"
        style={{ width: s.img, height: s.img }}
      >
        <img
          src="/logo.png"
          alt="The Steamer Zone"
          className="h-full w-full object-cover"
          width={s.img}
          height={s.img}
        />
      </div>
      <figcaption>
        <h1
          className={`font-semibold tracking-tight text-white ${s.title}`}
          style={{ textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}
        >
          The Steamer Zone
        </h1>
        {showSubtitle ? (
          <p className={`mt-1 font-medium uppercase tracking-[0.2em] text-white/70 ${s.sub}`}>
            TikTok LIVE Overlays
          </p>
        ) : null}
      </figcaption>
    </figure>
  );
}
