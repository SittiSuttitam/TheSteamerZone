import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TTS_SAMPLE_TEXT,
  DEFAULT_TTS_SETTINGS,
  findVoicePreset,
  voicesByRegion,
  type TtsSettingsShape,
  type TtsVoicePreset,
} from '@thesteamerzone/shared';
import { connectorUrl, api } from '../../lib/connector';
import {
  ensureSpeechVoices,
  groupVoicesByLang,
  recommendVoices,
  speakWebSpeech,
} from '../../lib/ttsWebSpeech';

const SAMPLE_KEYS = ['th', 'en', 'ja', 'zh'] as const;

export function TtsSettingsPanel() {
  const [settings, setSettings] = useState<TtsSettingsShape>({ ...DEFAULT_TTS_SETTINGS });
  const [testText, setTestText] = useState(TTS_SAMPLE_TEXT.th);
  const [status, setStatus] = useState<string | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [osHelpOpen, setOsHelpOpen] = useState(false);
  const [voiceErrors, setVoiceErrors] = useState<Record<string, string>>({});
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceSearch, setVoiceSearch] = useState('');

  const preset = findVoicePreset(settings.voice_id);
  const selectedSystemVoice = systemVoices.find(
    (v) => v.voiceURI === settings.system_voice_uri
  );

  const voiceGroups = useMemo(() => {
    const q = voiceSearch.trim().toLowerCase();
    const filtered = q
      ? systemVoices.filter(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            v.lang.toLowerCase().includes(q)
        )
      : systemVoices;
    return groupVoicesByLang(filtered);
  }, [systemVoices, voiceSearch]);

  function setStatusMsg(msg: string, isError = false) {
    setStatus(msg);
    setStatusError(isError);
  }

  const load = useCallback(() => {
    api<Partial<TtsSettingsShape>>(`${connectorUrl()}/api/tts/settings`)
      .then((d) => {
        setSettings({
          ...DEFAULT_TTS_SETTINGS,
          voice_id: d.voice_id ?? DEFAULT_TTS_SETTINGS.voice_id,
          system_voice_uri: d.system_voice_uri ?? '',
          rate: d.rate ?? 1,
          pitch: d.pitch ?? 0,
          volume: d.volume ?? 1,
          read_chat: !!d.read_chat,
          read_gifts: !!d.read_gifts,
          chat_template: d.chat_template ?? DEFAULT_TTS_SETTINGS.chat_template,
          gift_template: d.gift_template ?? DEFAULT_TTS_SETTINGS.gift_template,
        });
      })
      .catch(() => setStatusMsg('เปิด Connector ก่อน (หน้าเชื่อมต่อ) — ทดสอบเสียงในหน้านี้ยังได้', true));
  }, []);

  useEffect(() => {
    load();
    void ensureSpeechVoices().then((v) => {
      setSystemVoices(v);
      if (!settings.system_voice_uri && v.length > 0) {
        const th =
          v.find((x) => x.lang.toLowerCase().startsWith('th') && x.default) ??
          v.find((x) => x.lang.toLowerCase().startsWith('th'));
        if (th) {
          setSettings((s) =>
            s.system_voice_uri ? s : { ...s, system_voice_uri: th.voiceURI }
          );
        }
      }
    });
  }, [load]);

  async function playTest(opts?: { voiceId?: string; systemVoiceUri?: string }) {
    const text = testText.trim();
    if (!text) {
      setStatusMsg('กรุณาพิมพ์ข้อความทดสอบก่อน', true);
      return;
    }

    const systemVoiceUri = opts?.systemVoiceUri ?? settings.system_voice_uri;
    const voiceId = opts?.voiceId ?? settings.voice_id;
    const label =
      systemVoiceUri && systemVoices.find((v) => v.voiceURI === systemVoiceUri)
        ? systemVoices.find((v) => v.voiceURI === systemVoiceUri)!.name
        : findVoicePreset(voiceId)?.label ?? voiceId;

    setPlaying(true);
    setStatusMsg(`กำลังเล่น · ${label}…`);

    try {
      const result = await speakWebSpeech(text, {
        voiceId: systemVoiceUri ? undefined : voiceId,
        systemVoiceUri: systemVoiceUri || undefined,
        rate: settings.rate,
        pitch: settings.pitch,
        volume: settings.volume,
      });
      setStatusMsg(`✓ เล่นแล้ว · ${result.voiceName} (${result.voiceLang})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เล่นเสียงไม่ได้';
      setStatusMsg(`✗ ${msg}`, true);
    } finally {
      setPlaying(false);
    }
  }

  async function playVoice(voiceId: string) {
    const text = testText.trim();
    const presetLabel = findVoicePreset(voiceId)?.label ?? voiceId;

    if (!text) {
      setStatusMsg('กรุณาพิมพ์ข้อความทดสอบก่อน', true);
      setVoiceErrors((e) => ({ ...e, [voiceId]: 'ไม่มีข้อความ' }));
      return;
    }

    setPlaying(true);
    setStatusMsg(`กำลังเล่น · ${presetLabel}…`);

    try {
      const result = await speakWebSpeech(text, {
        voiceId,
        rate: settings.rate,
        pitch: settings.pitch,
        volume: settings.volume,
      });
      setVoiceErrors((e) => {
        const next = { ...e };
        delete next[voiceId];
        return next;
      });
      setStatusMsg(`✓ ${presetLabel} → ${result.voiceName}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'เล่นเสียงไม่ได้';
      setVoiceErrors((e) => ({ ...e, [voiceId]: msg }));
      setStatusMsg(`✗ ${presetLabel}: ${msg}`, true);
    } finally {
      setPlaying(false);
    }
  }

  async function sendToObs() {
    const text = testText.trim();
    if (!text) {
      setStatusMsg('กรุณาพิมพ์ข้อความทดสอบก่อน', true);
      return;
    }
    setPlaying(true);
    try {
      await api(`${connectorUrl()}/api/tts/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      setStatusMsg('ส่งไป OBS แล้ว — ต้องเปิด Browser Source ของ widget TTS');
    } catch {
      setStatusMsg('ส่ง OBS ไม่ได้ — เปิด Connector และใส่ URL widget TTS ใน OBS', true);
    } finally {
      setPlaying(false);
    }
  }

  async function save() {
    setSaving(true);
    setStatusMsg('กำลังบันทึก…');
    try {
      await api(`${connectorUrl()}/api/tts/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_id: settings.voice_id,
          system_voice_uri: settings.system_voice_uri || undefined,
          rate: settings.rate,
          pitch: settings.pitch,
          volume: settings.volume,
          read_chat: settings.read_chat,
          read_gifts: settings.read_gifts,
          chat_template: settings.chat_template,
          gift_template: settings.gift_template,
          engine_order: ['web_speech'],
          engines_enabled: { web_speech: true },
        }),
      });
      setStatusMsg('บันทึกแล้ว');
      load();
    } catch {
      setStatusMsg('บันทึกไม่สำเร็จ — เปิด Connector ก่อน', true);
    } finally {
      setSaving(false);
    }
  }

  function VoiceCard({ v }: { v: TtsVoicePreset }) {
    const selected = settings.voice_id === v.id;
    const err = voiceErrors[v.id];

    return (
      <div
        className={`rounded-xl border p-3 transition ${
          selected
            ? 'border-tsz-accent bg-tsz-accent/5 ring-1 ring-tsz-accent'
            : err
              ? 'border-red-300 bg-red-50/50'
              : 'border-tsz-border bg-white hover:border-tsz-accent/40'
        }`}
      >
        <label className="flex cursor-pointer gap-3">
          <input
            type="radio"
            name="voice"
            className="mt-1"
            checked={selected}
            onChange={() =>
              setSettings((s) => ({
                ...s,
                voice_id: v.id,
                system_voice_uri: '',
              }))
            }
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span>{v.flag}</span>
              <span className="font-medium text-tsz-text">{v.label}</span>
              <span className="rounded bg-green-100 px-1.5 text-[10px] font-medium text-green-900">
                ฟรี
              </span>
            </div>
            <p className="text-xs text-tsz-muted">
              {v.gender === 'female' ? 'หญิง' : 'ชาย'} · เสียงระบบ Windows
            </p>
            {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
          </div>
        </label>
        <button
          type="button"
          className="mt-2 w-full rounded-lg border border-tsz-border py-1.5 text-xs hover:bg-tsz-bg disabled:opacity-50"
          disabled={playing}
          onClick={() => void playVoice(v.id)}
        >
          {playing && selected ? 'กำลังเล่น…' : 'ทดสอบ'}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">เสียง & TTS</h1>
        <p className="text-sm text-tsz-muted">
          อ่านข้อความด้วยเสียงที่ติดตั้งใน Windows — ใช้ฟรี
        </p>
      </div>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-5 shadow-card">
        <h2 className="mb-1 text-sm font-semibold">🎙️ เลือกเสียงจากเครื่อง</h2>
        <p className="mb-3 text-xs text-tsz-muted">
          พบ {systemVoices.length} เสียง — เลือกแล้วกดทดสอบได้ทันที
        </p>
        <input
          type="search"
          className="mb-2 w-full rounded-lg border border-tsz-border px-3 py-2 text-sm"
          placeholder="ค้นหาชื่อเสียงหรือภาษา…"
          value={voiceSearch}
          onChange={(e) => setVoiceSearch(e.target.value)}
        />
        <label className="mb-1 block text-xs font-medium text-tsz-muted">เสียงที่ใช้</label>
        <select
          className="mb-3 w-full rounded-lg border border-tsz-border bg-white px-3 py-2.5 text-sm"
          value={settings.system_voice_uri ?? ''}
          onChange={(e) =>
            setSettings((s) => ({ ...s, system_voice_uri: e.target.value }))
          }
        >
          <option value="">— เลือกเสียง —</option>
          {voiceGroups.map((g) => (
            <optgroup key={g.lang} label={g.lang}>
              {g.voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                  {v.localService ? ' · ในเครื่อง' : ''}
                  {v.default ? ' · ค่าเริ่มต้น' : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-tsz-accent bg-tsz-accent/10 px-4 py-2 text-sm font-medium text-tsz-accent disabled:opacity-50"
            disabled={playing || !settings.system_voice_uri || !testText.trim()}
            onClick={() => void playTest()}
          >
            ทดสอบเสียงที่เลือก
          </button>
        </div>
        {selectedSystemVoice && (
          <p className="mt-2 text-xs text-tsz-muted">
            เลือกอยู่: <strong>{selectedSystemVoice.name}</strong> ({selectedSystemVoice.lang})
          </p>
        )}
      </section>

      <section className="rounded-xl border-2 border-tsz-accent/40 bg-tsz-surface p-5 shadow-card">
        <h2 className="mb-1 text-sm font-semibold">🔊 ทดสอบเสียง</h2>
        <p className="mb-3 text-xs text-tsz-muted">
          พิมพ์ข้อความแล้วกดเล่น — ได้ยินในเครื่องนี้ทันที
        </p>
        <label className="mb-2 block text-xs font-medium text-tsz-muted">ข้อความทดสอบ</label>
        <textarea
          className="mb-2 w-full rounded-lg border border-tsz-border px-3 py-2.5 text-sm leading-relaxed"
          rows={3}
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="พิมพ์ข้อความที่อยากให้อ่าน…"
        />
        <p className="mb-3 text-[11px] text-tsz-muted">{testText.trim().length} ตัวอักษร</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-tsz-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            disabled={playing || !testText.trim()}
            onClick={() => void playTest()}
          >
            {playing ? 'กำลังเล่น…' : '▶ เล่นเสียงตรงนี้'}
          </button>
          <button
            type="button"
            className="rounded-lg border border-tsz-border px-4 py-2 text-sm disabled:opacity-50"
            disabled={playing || !testText.trim()}
            onClick={() => void sendToObs()}
          >
            ส่งไป OBS
          </button>
          <button
            type="button"
            className="rounded-lg border border-tsz-border px-3 py-2 text-xs text-tsz-muted"
            onClick={() => setTestText('')}
          >
            ล้าง
          </button>
          {SAMPLE_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className="rounded-lg border border-dashed border-tsz-border px-2 py-1.5 text-xs disabled:opacity-50"
              disabled={playing}
              onClick={() => setTestText(TTS_SAMPLE_TEXT[k])}
            >
              ตัวอย่าง {k === 'th' ? '🇹🇭' : k === 'en' ? '🇺🇸' : k === 'ja' ? '🇯🇵' : '🇨🇳'}
            </button>
          ))}
        </div>
        {status && (
          <p
            className={`mt-3 text-sm font-medium ${statusError ? 'text-red-600' : 'text-tsz-muted'}`}
            role="alert"
          >
            {status}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-bg/40 px-5 py-4">
        <p className="text-xs font-medium text-tsz-muted">🎵 เสียงที่ใช้งาน</p>
        <p className="mt-1 font-semibold text-tsz-text">
          {selectedSystemVoice
            ? selectedSystemVoice.name
            : preset
              ? `${preset.flag} ${preset.label}`
              : settings.voice_id}
        </p>
        {selectedSystemVoice && (
          <p className="text-xs text-tsz-muted">{selectedSystemVoice.lang}</p>
        )}
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-5 shadow-card">
        <h2 className="mb-1 text-sm font-semibold">🇹🇭 ทางลัด (จับคู่เสียงอัตโนมัติ)</h2>
        <p className="mb-4 text-xs text-tsz-muted">
          เลือกทางลัดจะยกเลิกเสียงจาก dropdown ด้านบน — หรือใช้ dropdown โดยตรงก็ได้
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {voicesByRegion('th').map((v) => (
            <VoiceCard key={v.id} v={v} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-5 shadow-card">
        <h2 className="mb-4 text-sm font-semibold">🌍 ภาษาอื่น</h2>
        <p className="mb-4 text-xs text-amber-800">
          ญี่ปุ่น/จีนต้องติดตั้งภาษาใน Windows ก่อน ไม่งั้นจะขึ้น error
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {voicesByRegion('en')
            .concat(voicesByRegion('ja'), voicesByRegion('zh'))
            .map((v) => (
              <VoiceCard key={v.id} v={v} />
            ))}
        </div>
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface shadow-card">
        <button
          type="button"
          className="flex w-full px-5 py-4 text-left text-sm font-semibold"
          onClick={() => setAdvancedOpen((o) => !o)}
        >
          ▸ ความเร็ว / ระดับเสียง / ความดัง {advancedOpen ? '▼' : ''}
        </button>
        {advancedOpen && (
          <div className="grid gap-4 border-t border-tsz-border px-5 py-4 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-tsz-muted">
                ความเร็ว ({settings.rate.toFixed(2)})
              </span>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={settings.rate}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, rate: parseFloat(e.target.value) }))
                }
                className="w-full"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-tsz-muted">
                ระดับเสียง ({settings.pitch})
              </span>
              <input
                type="range"
                min={-10}
                max={10}
                step={1}
                value={settings.pitch}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, pitch: parseInt(e.target.value, 10) }))
                }
                className="w-full"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-tsz-muted">
                ความดัง ({settings.volume.toFixed(2)})
              </span>
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.05}
                value={settings.volume}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, volume: parseFloat(e.target.value) }))
                }
                className="w-full"
              />
            </label>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-5 shadow-card">
        <h2 className="mb-3 text-sm font-semibold">อ่านอัตโนมัติ (TikTok)</h2>
        <div className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.read_chat}
              onChange={(e) => setSettings((s) => ({ ...s, read_chat: e.target.checked }))}
            />
            อ่านแชท
          </label>
          <input
            className="w-full rounded-lg border border-tsz-border px-3 py-2 text-sm disabled:opacity-50"
            disabled={!settings.read_chat}
            value={settings.chat_template}
            onChange={(e) => setSettings((s) => ({ ...s, chat_template: e.target.value }))}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.read_gifts}
              onChange={(e) => setSettings((s) => ({ ...s, read_gifts: e.target.checked }))}
            />
            อ่านของขวัญ
          </label>
          <input
            className="w-full rounded-lg border border-tsz-border px-3 py-2 text-sm disabled:opacity-50"
            disabled={!settings.read_gifts}
            value={settings.gift_template}
            onChange={(e) => setSettings((s) => ({ ...s, gift_template: e.target.value }))}
          />
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-tsz-border bg-tsz-bg/50 p-4">
        <button
          type="button"
          className="text-sm font-medium text-tsz-accent"
          onClick={() => setOsHelpOpen((o) => !o)}
        >
          📚 ติดตั้งเสียงใน Windows
        </button>
        {osHelpOpen && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-tsz-muted">
            <li>Settings → Time & Language → Speech</li>
            <li>Manage voices → Add voices → เลือกภาษา (ไทย / อังกฤษ / ญี่ปุ่น / จีน)</li>
            <li>รีสตาร์ทเบราว์เซอร์ แล้วกลับมาทดสอบอีกครั้ง</li>
          </ol>
        )}
      </section>

      <button
        type="button"
        className="rounded-lg bg-tsz-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}
      </button>
    </div>
  );
}
