import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { connectorUrl, api } from '../lib/connector';
import { legacySamplePath } from '../lib/legacySamples';

type ImageSlot = 'positive' | 'negative' | 'heart' | 'hammer';

type SlotInfo = {
  type: ImageSlot;
  filename: string | null;
  url: string;
  isCustom: boolean;
  legacyFile: string;
};

const SLOT_META: Record<
  ImageSlot,
  { label: string; emoji: string; hint: string; when: string }
> = {
  positive: {
    label: 'รูปบวก / ชนะ',
    emoji: '😊',
    hint: 'แสดงเมื่อ WIN ≥ 0',
    when: 'โหมดชนะ',
  },
  negative: {
    label: 'รูปลบ / แพ้',
    emoji: '😢',
    hint: 'แสดงเมื่อ WIN < 0',
    when: 'โหมดแพ้',
  },
  heart: {
    label: 'หัวใจ (เอฟเฟ็กต์)',
    emoji: '❤️',
    hint: 'ลอยขึ้นเมื่อ WIN เพิ่ม',
    when: '+WIN',
  },
  hammer: {
    label: 'ค้อน (เอฟเฟ็กต์)',
    emoji: '🔨',
    hint: 'ทุบเมื่อ WIN ลด',
    when: '-WIN',
  },
};

function webBase() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function ImagesConfigPage() {
  const [slots, setSlots] = useState<Record<ImageSlot, SlotInfo> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<ImageSlot | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(() => {
    const q = `?webBase=${encodeURIComponent(webBase())}`;
    api<{ slots: Record<ImageSlot, SlotInfo> }>(
      `${connectorUrl()}/api/image-overlay/config${q}`
    )
      .then((d) => {
        setSlots(d.slots);
        setErr(null);
      })
      .catch((e: Error) => {
        setErr(e.message);
        setSlots(null);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onFile(slot: ImageSlot, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus('เลือกไฟล์รูป (PNG, JPG, GIF, WEBP)');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setStatus('ไฟล์ใหญ่เกิน 8MB');
      return;
    }
    setBusy(slot);
    setStatus(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'));
        r.readAsDataURL(file);
      });
      const res = await api<{ slots: Record<ImageSlot, SlotInfo> }>(
        `${connectorUrl()}/api/image-overlay/upload?webBase=${encodeURIComponent(webBase())}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: slot,
            filename: file.name,
            dataUrl,
            webBase: webBase(),
          }),
        }
      );
      setSlots(res.slots);
      setStatus(`อัปโหลด ${SLOT_META[slot].label} แล้ว`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ — เปิด Connector');
    } finally {
      setBusy(null);
    }
  }

  async function resetSlot(slot: ImageSlot) {
    setBusy(slot);
    try {
      const res = await api<{ slots: Record<ImageSlot, SlotInfo> }>(
        `${connectorUrl()}/api/image-overlay/reset?webBase=${encodeURIComponent(webBase())}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: slot, webBase: webBase() }),
        }
      );
      setSlots(res.slots);
      setStatus(`ใช้รูปเริ่มต้นสำหรับ ${SLOT_META[slot].label}`);
    } catch {
      setStatus('รีเซ็ตไม่สำเร็จ');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">ตั้งค่ารูปภาพ</h1>
        <p className="text-sm leading-relaxed text-tsz-muted">
          อัปโหลดรูปสำหรับวิดเจ็ต <strong className="text-tsz-text">Image Overlay</strong> ใน OBS —
          รองรับ PNG, JPG, GIF (เคลื่อนไหวได้) · เก็บในเครื่องที่รัน Connector
        </p>
        <p className="mt-2 text-xs text-tsz-muted">
          หลังตั้งค่า → ไปที่{' '}
          <Link to="/app/widgets" className="text-tsz-accent underline">
            Widgets
          </Link>{' '}
          คัดลอก URL วิดเจ็ต «รูป/เอฟเฟ็กต์» ไปใส่ OBS
        </p>
      </div>

      {err && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          เปิด Connector ก่อน (หน้าเชื่อมต่อ) — {err}
        </p>
      )}

      {status && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {status}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {(Object.keys(SLOT_META) as ImageSlot[]).map((slot) => {
          const meta = SLOT_META[slot];
          const info = slots?.[slot];
          const src =
            info?.url ||
            legacySamplePath(
              slot === 'positive'
                ? 'positive.png'
                : slot === 'negative'
                  ? 'negative.png'
                  : slot === 'heart'
                    ? 'heart.png'
                    : 'hammer.png'
            );
          return (
            <article
              key={slot}
              className="flex flex-col rounded-xl border border-tsz-border bg-tsz-surface p-5 shadow-card"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <span className="text-2xl">{meta.emoji}</span>
                  <h2 className="font-semibold text-tsz-text">{meta.label}</h2>
                  <p className="text-xs text-tsz-muted">{meta.hint}</p>
                </div>
                {info?.isCustom ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                    รูปของคุณ
                  </span>
                ) : (
                  <span className="rounded-full bg-tsz-bg px-2 py-0.5 text-[10px] text-tsz-muted">
                    เริ่มต้น
                  </span>
                )}
              </div>

              <div className="mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-tsz-border bg-tsz-bg/50 p-4">
                <img
                  src={src}
                  alt={meta.label}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="mt-auto flex flex-col gap-2">
                <label className="cursor-pointer rounded-lg border border-dashed border-tsz-border bg-tsz-bg/30 px-3 py-3 text-center text-xs font-medium text-tsz-accent hover:bg-tsz-bg">
                  {busy === slot ? 'กำลังอัปโหลด…' : '📁 เลือกรูปใหม่'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    disabled={!!busy}
                    onChange={(e) => void onFile(slot, e.target.files?.[0])}
                  />
                </label>
                <button
                  type="button"
                  className="rounded-lg border border-tsz-border py-2 text-xs hover:bg-tsz-bg disabled:opacity-40"
                  disabled={!!busy || !info?.isCustom}
                  onClick={() => void resetSlot(slot)}
                >
                  ใช้รูปเริ่มต้น
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <section className="rounded-xl border border-blue-200/70 bg-blue-50/50 p-5 text-sm text-tsz-muted">
        <h3 className="mb-2 font-semibold text-tsz-text">วิธีใช้ใน OBS</h3>
        <ol className="list-decimal space-y-1 pl-5">
          <li>อัปโหลดรูปทั้ง 4 ช่อง (หรือใช้รูปเริ่มต้น)</li>
          <li>
            เปิดหน้า <Link to="/app/widgets" className="text-tsz-accent underline">Widgets</Link>{' '}
            → คัดลอก URL วิดเจ็ต Image
          </li>
          <li>OBS → Browser Source → วาง URL · ขนาด 1920×1080</li>
          <li>เมื่อ WIN เปลี่ยน รูปจะสลับบวก/ลบอัตโนมัติ (ต้องเชื่อม Connector + Realtime)</li>
        </ol>
      </section>
    </div>
  );
}
