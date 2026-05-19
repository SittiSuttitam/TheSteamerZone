import { useEffect, useState } from 'react';
import { canReachLocalConnector, connectorUrl, api } from '../lib/connector';
import { DEFAULT_GIFT_CONFIG } from '../lib/defaultGiftConfig';
import { getSupabase } from '../lib/supabase';
import { saveRoomGiftConfig } from '../lib/giftConfigCloud';

type GiftMapping = {
  giftId?: string;
  giftName?: string;
  name?: string;
  action: 'win' | 'key';
  value?: number;
  multiplier?: number;
  enabled?: boolean;
};

type WheelItem = {
  label: string;
  weight: number;
  action: string;
  value: number;
  effect?: string;
};

export type GiftConfig = {
  enabled: boolean;
  mockEnabled?: boolean;
  mappings: GiftMapping[];
  wheel: {
    enabled: boolean;
    triggerIds?: string[];
    items: WheelItem[];
    spinMs?: number;
  };
};

const emptyMapping = (): GiftMapping => ({
  giftId: '',
  giftName: '',
  action: 'win',
  value: 1,
  multiplier: 1,
  enabled: true,
});

export function GiftRulesEditor({
  initial,
  loading,
  loadFailed,
  roomId,
  onSaved,
}: {
  initial: GiftConfig | null;
  loading?: boolean;
  loadFailed?: boolean;
  roomId?: string;
  onSaved: (msg: string) => void;
}) {
  const [cfg, setCfg] = useState<GiftConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'gifts' | 'wheel'>('gifts');

  useEffect(() => {
    if (initial) {
      setCfg(initial);
    } else if (!loading && loadFailed) {
      setCfg(DEFAULT_GIFT_CONFIG);
    }
  }, [initial, loading, loadFailed]);

  if (loading) {
    return <p className="text-sm text-tsz-muted">กำลังโหลด…</p>;
  }

  if (!cfg) {
    return (
      <p className="text-sm text-amber-800">
        โหลดไม่สำเร็จ — เปิด Connector ที่หน้าเชื่อมต่อ แล้วรีเฟรชหน้านี้
      </p>
    );
  }

  async function save() {
    if (!cfg) return;
    const rid = roomId?.trim();
    if (!rid) {
      onSaved('โหลดห้องจากบัญชีก่อน — กฎจะผูกกับห้องของคุณเท่านั้น');
      return;
    }
    setSaving(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('ยังไม่ตั้งค่า Supabase');
      await saveRoomGiftConfig(sb, rid, cfg);
      if (canReachLocalConnector()) {
        try {
          await api(`${connectorUrl()}/api/config/gift`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cfg),
          });
          onSaved('บันทึกกฎของขวัญแล้ว (คลาวด์ + Connector)');
          return;
        } catch {
          /* fall through */
        }
      }
      onSaved(
        'บันทึกบนคลาวด์แล้ว — เปิด Connector บนเครื่องแล้วกด「เชื่อมต่อทั้งหมด」เพื่อใช้กับ TikTok Live'
      );
    } catch (e) {
      onSaved(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  function updateMapping(i: number, patch: Partial<GiftMapping>) {
    setCfg((c) => {
      if (!c) return c;
      const mappings = [...c.mappings];
      mappings[i] = { ...mappings[i], ...patch };
      return { ...c, mappings };
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-tsz-border bg-tsz-surface p-4 shadow-card">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
            className="h-4 w-4"
          />
          เปิดใช้กฎของขวัญ (เมื่อได้ของขวัญจาก TikTok)
        </label>
        <button
          type="button"
          disabled={saving}
          className="rounded-lg bg-tsz-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void save()}
        >
          {saving ? 'กำลังบันทึก…' : 'บันทึกทั้งหมด'}
        </button>
      </div>

      <div className="flex gap-2 border-b border-tsz-border">
        {(['gifts', 'wheel'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t
                ? 'border-tsz-accent text-tsz-accent'
                : 'border-transparent text-tsz-muted hover:text-tsz-text'
            }`}
            onClick={() => setTab(t)}
          >
            {t === 'gifts' ? 'ของขวัญ → WIN' : 'วงล้อ'}
          </button>
        ))}
      </div>

      {tab === 'gifts' && (
        <div className="space-y-4">
          <p className="text-xs text-tsz-muted">
            ใส่รหัสของขวัญจาก TikTok (เช่น Rose = 5655) หรือชื่อภาษาอังกฤษ — เมื่อมีคนส่ง ระบบจะ +/- WIN ตามที่ตั้ง
          </p>
          {cfg.mappings.map((m, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-xl border border-tsz-border bg-tsz-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-5"
            >
              <label className="text-xs">
                <span className="mb-1 block text-tsz-muted">รหัสของขวัญ</span>
                <input
                  className="w-full rounded-lg border border-tsz-border px-2 py-1.5 text-sm"
                  placeholder="5655"
                  value={m.giftId ?? ''}
                  onChange={(e) => updateMapping(i, { giftId: e.target.value })}
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-tsz-muted">ชื่อ (ไม่บังคับ)</span>
                <input
                  className="w-full rounded-lg border border-tsz-border px-2 py-1.5 text-sm"
                  placeholder="Rose"
                  value={m.giftName ?? m.name ?? ''}
                  onChange={(e) => updateMapping(i, { giftName: e.target.value, name: e.target.value })}
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-tsz-muted">ทำอะไร</span>
                <select
                  className="w-full rounded-lg border border-tsz-border px-2 py-1.5 text-sm"
                  value={m.action}
                  onChange={(e) =>
                    updateMapping(i, { action: e.target.value as 'win' | 'key' })
                  }
                >
                  <option value="win">เพิ่ม/ลด WIN</option>
                  <option value="key">กดคีย์ (ขั้นสูง)</option>
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-tsz-muted">ค่า (+/-)</span>
                <input
                  type="number"
                  className="w-full rounded-lg border border-tsz-border px-2 py-1.5 text-sm"
                  value={m.value ?? 0}
                  onChange={(e) =>
                    updateMapping(i, { value: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </label>
              <label className="flex items-end gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={m.enabled !== false}
                  onChange={(e) => updateMapping(i, { enabled: e.target.checked })}
                />
                เปิดใช้
                <button
                  type="button"
                  className="ml-auto text-red-600 hover:underline"
                  onClick={() =>
                    setCfg((c) =>
                      c
                        ? {
                            ...c,
                            mappings: c.mappings.filter((_, j) => j !== i),
                          }
                        : c
                    )
                  }
                >
                  ลบ
                </button>
              </label>
            </div>
          ))}
          <button
            type="button"
            className="rounded-lg border border-dashed border-tsz-border px-4 py-2 text-sm text-tsz-accent hover:bg-tsz-bg"
            onClick={() =>
              setCfg((c) => (c ? { ...c, mappings: [...c.mappings, emptyMapping()] } : c))
            }
          >
            + เพิ่มของขวัญ
          </button>
        </div>
      )}

      {tab === 'wheel' && (
        <div className="space-y-4 rounded-xl border border-tsz-border bg-tsz-surface p-5 shadow-card">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={cfg.wheel.enabled}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  wheel: { ...cfg.wheel, enabled: e.target.checked },
                })
              }
            />
            เปิดวงล้อเมื่อได้ของขวัญที่กำหนด
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-tsz-muted">
              รหัสของขวัญที่ให้หมุน (คั่นด้วยจุลภาค)
            </span>
            <input
              className="w-full max-w-md rounded-lg border border-tsz-border px-3 py-2 text-sm"
              value={(cfg.wheel.triggerIds ?? []).join(', ')}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  wheel: {
                    ...cfg.wheel,
                    triggerIds: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                })
              }
              placeholder="5655"
            />
          </label>
          <p className="text-xs text-tsz-muted">
            ช่องวงล้อแก้ในไฟล์ config ขั้นสูงได้ภายหลัง — ตอนนี้ใช้ค่าเริ่มต้น +5, +3, -1 ฯลฯ
          </p>
          <ul className="text-sm text-tsz-muted">
            {cfg.wheel.items?.map((it, i) => (
              <li key={i}>
                {it.label} → {it.action} {it.value}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
