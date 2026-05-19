import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSupabase } from '../lib/supabase';
import {
  IMAGE_SLOTS,
  type ImageSlot,
  type OverlaySlotView,
  deleteUserOverlayImage,
  fetchUserOverlaySlots,
  uploadUserOverlayImage,
} from '../lib/imageOverlayCloud';

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

export function ImagesConfigPage() {
  const { user, supabaseConfigured } = useAuth();
  const [slots, setSlots] = useState<Record<ImageSlot, OverlaySlotView> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<ImageSlot | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) {
      setErr('ล็อกอิน Google ก่อน แล้วรีเฟรชหน้านี้');
      setSlots(null);
      return;
    }
    try {
      const data = await fetchUserOverlaySlots(sb, user.id);
      setSlots(data);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setSlots(null);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onFile(slot: ImageSlot, file: File | undefined) {
    if (!file || !user) return;
    const sb = getSupabase();
    if (!sb) return;
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
      const next = await uploadUserOverlayImage(sb, user.id, slot, file);
      setSlots(next);
      setStatus(`อัปโหลด ${SLOT_META[slot].label} แล้ว — บันทึกในบัญชีของคุณ`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ');
    } finally {
      setBusy(null);
    }
  }

  async function removeSlot(slot: ImageSlot) {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;
    setBusy(slot);
    setStatus(null);
    try {
      const next = await deleteUserOverlayImage(sb, user.id, slot);
      setSlots(next);
      setStatus(`ลบรูปแล้ว — ใช้รูป demo สำหรับ ${SLOT_META[slot].label}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'ลบไม่สำเร็จ');
    } finally {
      setBusy(null);
    }
  }

  if (!supabaseConfigured) {
    return (
      <p className="text-sm text-tsz-muted">
        ตั้งค่า Supabase ใน <code className="rounded bg-tsz-bg px-1">.env</code> ก่อน
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">ตั้งค่ารูปภาพ</h1>
        <p className="text-sm leading-relaxed text-tsz-muted">
          อัปโหลดรูปสำหรับวิดเจ็ต <strong className="text-tsz-text">Image Overlay</strong> ใน OBS —
          เก็บแยกตามบัญชีของคุณบน Supabase · ช่องที่ยังไม่เคยอัปโหลดจะใช้รูป demo
        </p>
        {user?.id && (
          <p className="mt-2 font-mono text-[11px] text-tsz-muted/80">
            รหัสบัญชี: {user.id}
          </p>
        )}
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
          {err}
          {err.includes('relation') || err.includes('bucket') ? (
            <>
              {' '}
              — รัน migration{' '}
              <code className="rounded bg-white/80 px-1">20250519130000_user_overlay_images.sql</code>{' '}
              ใน Supabase SQL Editor
            </>
          ) : null}
        </p>
      )}

      {status && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {status}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {IMAGE_SLOTS.map((slot) => {
          const meta = SLOT_META[slot];
          const info = slots?.[slot];
          const src = info?.url ?? '';
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
                    รูป demo
                  </span>
                )}
              </div>

              <div className="mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-tsz-border bg-tsz-bg/50 p-4">
                {src ? (
                  <img
                    src={src}
                    alt={meta.label}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-tsz-border border-t-tsz-accent" />
                )}
              </div>

              <div className="mt-auto flex flex-col gap-2">
                <label className="cursor-pointer rounded-lg border border-dashed border-tsz-border bg-tsz-bg/30 px-3 py-3 text-center text-xs font-medium text-tsz-accent hover:bg-tsz-bg">
                  {busy === slot ? 'กำลังอัปโหลด…' : '📁 เลือกรูปใหม่'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    disabled={!!busy || !user}
                    onChange={(e) => void onFile(slot, e.target.files?.[0])}
                  />
                </label>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 py-2 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40"
                  disabled={!!busy || !info?.isCustom}
                  onClick={() => void removeSlot(slot)}
                >
                  ลบรูป
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <section className="rounded-xl border border-blue-200/70 bg-blue-50/50 p-5 text-sm text-tsz-muted">
        <h3 className="mb-2 font-semibold text-tsz-text">วิธีใช้ใน OBS</h3>
        <ol className="list-decimal space-y-1 pl-5">
          <li>อัปโหลดรูปทั้ง 4 ช่อง (หรือปล่อยให้เป็นรูป demo)</li>
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
