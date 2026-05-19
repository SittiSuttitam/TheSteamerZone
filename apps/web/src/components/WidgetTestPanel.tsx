import { useCallback, useEffect, useState } from 'react';
import { connectorUrl, api } from '../lib/connector';
import { playWidgetSound } from '../lib/playWidgetSound';

type ViewerConfig = {
  enabled: boolean;
  volume: number;
  trackedUsers: Array<{
    username: string;
    displayName?: string;
    soundFile?: string;
  }>;
  sounds?: string[];
};

const GIFT_PRESETS = [
  { label: 'Rose (+1)', giftId: '5655', giftName: 'Rose', repeatCount: 1 },
  { label: 'Rose x5', giftId: '5655', giftName: 'Rose', repeatCount: 5 },
  { label: 'Heart Me', giftId: '7934', giftName: 'Heart Me', repeatCount: 1 },
  { label: 'TikTok', giftId: '5269', giftName: 'TikTok', repeatCount: 1 },
];

type Props = {
  roomReady: boolean;
};

type WinState = { win: number; winLabel?: string };

export function WidgetTestPanel({ roomReady }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [connectorWin, setConnectorWin] = useState<number | null>(null);
  const [cloudReady, setCloudReady] = useState<boolean | null>(null);
  const [customGift, setCustomGift] = useState({ giftName: 'Rose', giftId: '5655', repeat: 1 });
  const [customDelta, setCustomDelta] = useState(3);
  const [chatText, setChatText] = useState('สวัสดีครับ');
  const [vipUser, setVipUser] = useState('');
  const [vipName, setVipName] = useState('');
  const [vipSound, setVipSound] = useState('increment.mp3');
  const [viewer, setViewer] = useState<ViewerConfig | null>(null);
  const [winSounds, setWinSounds] = useState({
    incrementFile: 'increment.mp3',
    decrementFile: 'decrement.mp3',
  });

  const base = connectorUrl();

  const run = useCallback(
    async (label: string, fn: () => Promise<unknown>) => {
      setBusy(true);
      setMsg(null);
      try {
        await fn();
        setMsg(`✓ ${label}`);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'เปิด Connector ก่อน');
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const loadViewer = useCallback(() => {
    api<ViewerConfig>(`${base}/api/config/viewer`)
      .then((v) => {
        setViewer(v);
        if (v.sounds?.length) setVipSound(v.sounds[0]);
      })
      .catch(() => setViewer(null));
    api<{ incrementFile: string; decrementFile: string; files: string[] }>(
      `${base}/api/config/sounds`
    )
      .then((s) =>
        setWinSounds({
          incrementFile: s.incrementFile || 'increment.mp3',
          decrementFile: s.decrementFile || 'decrement.mp3',
        })
      )
      .catch(() => {});
  }, [base]);

  useEffect(() => {
    loadViewer();
  }, [loadViewer]);

  useEffect(() => {
    api<{ cloudReady?: boolean; supabase?: boolean }>(`${base}/health`)
      .then((h) => setCloudReady(!!(h.cloudReady ?? h.supabase)))
      .catch(() => setCloudReady(false));
  }, [base]);

  async function refreshConnectorWin() {
    try {
      const s = await api<WinState>(`${base}/api/state`);
      setConnectorWin(s.win);
    } catch {
      setConnectorWin(null);
    }
  }

  async function winTest(
    label: string,
    path: string,
    init?: RequestInit,
    sound?: 'increment' | 'decrement'
  ) {
    setBusy(true);
    setMsg(null);
    try {
      const s = await api<WinState>(`${base}${path}`, {
        method: 'POST',
        ...init,
      });
      setConnectorWin(s.win);
      if (sound) {
        playWidgetSound({
          file:
            sound === 'increment' ? winSounds.incrementFile : winSounds.decrementFile,
          volume: viewer?.volume,
        });
      }
      if (cloudReady === false) {
        setMsg(
          `✓ ${label} (Connector: ${s.win}) — แต่ OBS ยังไม่อัปเดต: ไปหน้า「เริ่มใช้งาน」กดเชื่อมต่อทั้งหมด`
        );
      } else {
        setMsg(`✓ ${label} → WIN = ${s.win} (ดูใน OBS ได้)`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'เปิด Connector ก่อน');
    } finally {
      setBusy(false);
    }
  }

  async function saveVipList(users: ViewerConfig['trackedUsers']) {
    const cur = viewer || { enabled: true, volume: 0.7, trackedUsers: [] };
    await api(`${base}/api/config/viewer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cur, trackedUsers: users }),
    });
    loadViewer();
  }

  if (!roomReady) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
        โหลดห้องและเชื่อม Connector ก่อน — ถึงจะทดสอบวิดเจ็ตได้
      </section>
    );
  }

  const sounds = viewer?.sounds || ['increment.mp3', 'decrement.mp3'];

  return (
    <section className="mb-8 rounded-xl border-2 border-violet-300/60 bg-gradient-to-b from-violet-50/80 to-tsz-surface p-5 shadow-card">
      <h2 className="mb-1 text-lg font-semibold">🧪 ทดสอบวิดเจ็ต (Mock)</h2>
      <p className="mb-4 text-xs text-tsz-muted">
        ใส่ Widget <strong>win</strong> + <strong>sound</strong> ใน OBS ก่อน แล้วกดทดสอบ
      </p>

      {cloudReady === false && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          ซิงก์คลาวด์ยังไม่ทำงาน — ตัวเลข/เสียงใน OBS จะไม่เปลี่ยน จนกว่าจะล็อกอินเว็บแล้วกด「เชื่อมต่อทั้งหมด」
        </p>
      )}
      {cloudReady === true && (
        <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          ✓ ซิงก์คลาวด์พร้อม — กดทดสอบแล้วดูใน OBS
        </p>
      )}
      {connectorWin !== null && (
        <p className="mb-4 text-center font-mono text-2xl font-bold text-tsz-accent">
          WIN บน Connector: {connectorWin}
        </p>
      )}

      {msg && (
        <p className="mb-4 rounded-lg bg-tsz-bg px-3 py-2 text-sm" role="status">
          {msg}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* WIN */}
        <div className="rounded-lg border border-tsz-border bg-white/60 p-4">
          <h3 className="mb-3 text-sm font-semibold">ตัวนับ WIN (+ / −)</h3>
          <div className="flex flex-wrap gap-2">
            {[
              ['+1', '/api/win/increment', undefined, 'increment' as const],
              ['−1', '/api/win/decrement', undefined, 'decrement' as const],
              [
                '+5',
                '/api/win/delta',
                {
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ delta: 5 }),
                },
                'increment' as const,
              ],
              [
                '−5',
                '/api/win/delta',
                {
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ delta: -5 }),
                },
                'decrement' as const,
              ],
              ['รีเซ็ต', '/api/win/reset', undefined, undefined],
            ].map(([label, path, init, sound]) => (
              <button
                key={String(label)}
                type="button"
                disabled={busy}
                className="rounded-lg border border-tsz-border bg-tsz-surface px-3 py-2 text-sm font-medium hover:bg-tsz-bg disabled:opacity-50"
                onClick={() =>
                  void winTest(
                    String(label),
                    String(path),
                    init as RequestInit | undefined,
                    sound as 'increment' | 'decrement' | undefined
                  )
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              className="w-20 rounded border border-tsz-border px-2 py-1 text-sm"
              value={customDelta}
              onChange={(e) => setCustomDelta(Number(e.target.value))}
            />
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-tsz-accent px-3 py-1 text-sm text-white disabled:opacity-50"
              onClick={() =>
                void winTest(
                  `Δ ${customDelta}`,
                  '/api/win/delta',
                  {
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ delta: customDelta }),
                  },
                  customDelta > 0 ? 'increment' : customDelta < 0 ? 'decrement' : undefined
                )
              }
            >
              ส่งค่าเอง
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="text-xs text-tsz-accent underline"
              onClick={() => {
                playWidgetSound({
                  file: winSounds.incrementFile,
                  volume: viewer?.volume,
                });
                setMsg('เล่นเสียง + บนเครื่องนี้ (ไม่ผ่าน OBS)');
              }}
            >
              ฟังเสียง + ที่นี่
            </button>
            <button
              type="button"
              className="text-xs text-tsz-accent underline"
              onClick={() => {
                playWidgetSound({
                  file: winSounds.decrementFile,
                  volume: viewer?.volume,
                });
                setMsg('เล่นเสียง − บนเครื่องนี้');
              }}
            >
              ฟังเสียง − ที่นี่
            </button>
          </div>
        </div>

        {/* Sounds broadcast */}
        <div className="rounded-lg border border-tsz-border bg-white/60 p-4">
          <h3 className="mb-3 text-sm font-semibold">เสียงใน OBS (ผ่าน Widget เสียง)</h3>
          <p className="mb-2 text-xs text-tsz-muted">
            ใส่ Browser Source ลิงก์ <strong>/w/…/sound</strong> ขนาด 1×1 px
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-tsz-border px-3 py-2 text-sm disabled:opacity-50"
              onClick={() =>
                void run('เสียง +', () =>
                  api(`${base}/api/test/sound`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: 'increment',
                      file: winSounds.incrementFile,
                    }),
                  })
                )
              }
            >
              🔊 เสียง +
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-tsz-border px-3 py-2 text-sm disabled:opacity-50"
              onClick={() =>
                void run('เสียง −', () =>
                  api(`${base}/api/test/sound`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: 'decrement',
                      file: winSounds.decrementFile,
                    }),
                  })
                )
              }
            >
              🔉 เสียง −
            </button>
          </div>
        </div>

        {/* Mock gifts */}
        <div className="rounded-lg border border-tsz-border bg-white/60 p-4">
          <h3 className="mb-3 text-sm font-semibold">ของขวัญจำลอง</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            {GIFT_PRESETS.map((g) => (
              <button
                key={g.label}
                type="button"
                disabled={busy}
                className="rounded-lg border border-tsz-border px-2 py-1.5 text-xs disabled:opacity-50"
                onClick={() =>
                  void run(g.label, () =>
                    api(`${base}/api/mock/gift`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        giftId: g.giftId,
                        giftName: g.giftName,
                        repeatCount: g.repeatCount,
                        nickname: 'ผู้ทดสอบ',
                        uniqueId: 'mock_tester',
                      }),
                    })
                  )
                }
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className="rounded border border-tsz-border px-2 py-1 text-xs"
              placeholder="ชื่อของขวัญ"
              value={customGift.giftName}
              onChange={(e) => setCustomGift((c) => ({ ...c, giftName: e.target.value }))}
            />
            <input
              className="rounded border border-tsz-border px-2 py-1 text-xs"
              placeholder="gift id"
              value={customGift.giftId}
              onChange={(e) => setCustomGift((c) => ({ ...c, giftId: e.target.value }))}
            />
            <input
              type="number"
              min={1}
              className="rounded border border-tsz-border px-2 py-1 text-xs"
              value={customGift.repeat}
              onChange={(e) =>
                setCustomGift((c) => ({ ...c, repeat: Number(e.target.value) || 1 }))
              }
            />
          </div>
          <button
            type="button"
            disabled={busy}
            className="mt-2 w-full rounded-lg bg-violet-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            onClick={() =>
              void run('ของขวัญกำหนดเอง', () =>
                api(`${base}/api/mock/gift`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    giftId: customGift.giftId,
                    giftName: customGift.giftName,
                    repeatCount: customGift.repeat,
                    nickname: 'ผู้ทดสอบ',
                    uniqueId: 'mock_tester',
                  }),
                })
              )
            }
          >
            ส่งของขวัญกำหนดเอง
          </button>
        </div>

        {/* Wheel + Chat */}
        <div className="rounded-lg border border-tsz-border bg-white/60 p-4">
          <h3 className="mb-3 text-sm font-semibold">วงล้อ & แชท</h3>
          <button
            type="button"
            disabled={busy}
            className="mb-3 w-full rounded-lg border border-tsz-border px-3 py-2 text-sm disabled:opacity-50"
            onClick={() =>
              void run('หมุนวงล้อ', () =>
                api(`${base}/api/wheel/mock-spin`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ count: 1 }),
                })
              )
            }
          >
            🎡 ทดสอบหมุนวงล้อ
          </button>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded border border-tsz-border px-2 py-1 text-sm"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
            />
            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-tsz-border px-3 py-1 text-sm disabled:opacity-50"
              onClick={() =>
                void run('แชท', () =>
                  api(`${base}/api/mock/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      comment: chatText,
                      nickname: 'ผู้ทดสอบ',
                      uniqueId: 'mock_tester',
                    }),
                  })
                )
              }
            >
              💬 แชท
            </button>
          </div>
        </div>

        {/* VIP */}
        <div className="rounded-lg border border-tsz-border bg-white/60 p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold">⭐ VIP Alert</h3>
          <p className="mb-3 text-xs text-tsz-muted">
            เพิ่ม VIP แล้วทดสอบ — เสียงเล่นผ่าน Widget <strong>/sound</strong> เมื่อ VIP เข้าห้อง (แชท/ของขวัญครั้งแรก)
          </p>
          <div className="mb-3 grid gap-2 sm:grid-cols-4">
            <input
              className="rounded border border-tsz-border px-2 py-1 text-sm"
              placeholder="@username"
              value={vipUser}
              onChange={(e) => setVipUser(e.target.value)}
            />
            <input
              className="rounded border border-tsz-border px-2 py-1 text-sm"
              placeholder="ชื่อแสดง"
              value={vipName}
              onChange={(e) => setVipName(e.target.value)}
            />
            <select
              className="rounded border border-tsz-border px-2 py-1 text-sm"
              value={vipSound}
              onChange={(e) => setVipSound(e.target.value)}
            >
              {sounds.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !vipUser.trim()}
              className="rounded-lg bg-amber-500 px-3 py-1 text-sm text-white disabled:opacity-50"
              onClick={() =>
                void run('เพิ่ม VIP', async () => {
                  const u = vipUser.trim().replace(/^@/, '').toLowerCase();
                  const list = [...(viewer?.trackedUsers || [])];
                  if (list.some((x) => x.username === u)) throw new Error('มี VIP นี้แล้ว');
                  list.push({
                    username: u,
                    displayName: vipName.trim() || u,
                    soundFile: vipSound,
                  });
                  await saveVipList(list);
                  setVipUser('');
                  setVipName('');
                })
              }
            >
              + เพิ่ม VIP
            </button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {(viewer?.trackedUsers || []).map((u) => (
              <span
                key={u.username}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs"
              >
                @{u.username} ({u.soundFile})
                <button
                  type="button"
                  className="text-red-600"
                  onClick={() =>
                    void run('ลบ VIP', () =>
                      saveVipList(
                        (viewer?.trackedUsers || []).filter(
                          (x) => x.username !== u.username
                        )
                      )
                    )
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-tsz-accent px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={() =>
                void run('ทดสอบ VIP', () =>
                  api(`${base}/api/test/vip`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      username: vipUser.trim() || viewer?.trackedUsers[0]?.username,
                      displayName: vipName.trim(),
                      soundFile: vipSound,
                    }),
                  })
                )
              }
            >
              🔔 ทดสอบเสียง VIP (เข้าห้อง)
            </button>
            <button
              type="button"
              disabled={busy || !vipUser.trim()}
              className="rounded-lg border border-tsz-border px-4 py-2 text-sm disabled:opacity-50"
              onClick={() =>
                void run('แชทจาก VIP', () =>
                  api(`${base}/api/mock/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      comment: 'VIP เข้ามาแล้ว!',
                      nickname: vipName || vipUser,
                      uniqueId: vipUser.trim().replace(/^@/, ''),
                    }),
                  })
                )
              }
            >
              แชทจาก VIP (ทริกเข้าห้อง)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
