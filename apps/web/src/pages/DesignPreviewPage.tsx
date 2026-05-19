import { legacySamplePath } from '../lib/legacySamples';

const OVERLAY_IMAGES: { file: string; title: string; hint: string }[] = [
  { file: 'positive.png', title: 'บวก', hint: 'โหมดบวก / ชนะ' },
  { file: 'negative.png', title: 'ลบ', hint: 'โหมดลบ / แพ้' },
  { file: 'hammer.png', title: 'ค้อน', hint: 'เอฟเฟ็กต์พิเศษ' },
  { file: 'heart.png', title: 'หัวใจ', hint: 'ไลค์ / หัวใจ' },
];

export function DesignPreviewPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">ตัวอย่างดีไซน์</h1>
        <p className="text-sm leading-relaxed text-tsz-muted">
          รูปและสไตล์อ้างอิงจากโปรเจกต์เดิม (<code className="rounded bg-tsz-bg px-1">static/*.png</code>) —
          ใช้ในโอเวอร์เลย์รูปภาพและคอนโทรลเลอร์เดิม
        </p>
      </div>

      <section className="rounded-2xl border border-tsz-border bg-tsz-surface p-6 shadow-card">
        <h2 className="mb-1 text-sm font-semibold text-tsz-text">รูปตัวอย่าง (legacy)</h2>
        <p className="mb-6 text-xs text-tsz-muted">
          ไฟล์อยู่ที่ <code className="rounded bg-tsz-bg px-1">public/legacy-samples/</code> — OBS / เบราว์เซอร์โหลดตรงๆ ได้
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {OVERLAY_IMAGES.map((item) => (
            <figure
              key={item.file}
              className="overflow-hidden rounded-xl border border-tsz-border bg-tsz-bg/40 shadow-sm"
            >
              <div className="flex aspect-square items-center justify-center bg-[linear-gradient(145deg,var(--tw-gradient-stops))] from-white to-tsz-bg p-4">
                <img
                  src={legacySamplePath(item.file)}
                  alt={item.title}
                  className="max-h-full max-w-full object-contain drop-shadow-sm"
                  loading="lazy"
                />
              </div>
              <figcaption className="border-t border-tsz-border px-3 py-2 text-center text-xs">
                <span className="font-medium text-tsz-text">{item.title}</span>
                <span className="mt-0.5 block text-tsz-muted">{item.hint}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-tsz-border bg-tsz-surface p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold text-tsz-text">พรีวิวการ์ดสไตล์ «ชนะ»</h2>
        <p className="mb-4 text-xs text-tsz-muted">
          จำลองโทนพื้นหลังและขอบแบบแอปใหม่ — ใช้รูปบวกจาก legacy เป็นตัวอย่าง
        </p>
        <div className="flex max-w-md flex-col gap-3 rounded-2xl border border-tsz-border bg-gradient-to-br from-emerald-50/90 to-tsz-surface p-6 shadow-card">
          <div className="flex items-center gap-4">
            <img
              src={legacySamplePath('positive.png')}
              alt=""
              className="h-16 w-16 shrink-0 rounded-xl object-contain ring-1 ring-black/5"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/80">Win</p>
              <p className="text-lg font-semibold tracking-tight text-tsz-text">+1 คะแนน</p>
              <p className="text-xs text-tsz-muted">ตัวอย่างจาก Rose — โปรเจกต์เดิม</p>
            </div>
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-tsz-muted">
        ไอคอนแอปเดิม:{' '}
        <img
          src={legacySamplePath('icon.png')}
          alt=""
          className="inline-block h-6 w-6 align-middle opacity-80"
        />
      </p>
    </div>
  );
}
