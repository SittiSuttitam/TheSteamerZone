import { useCallback, useEffect, useState } from 'react';
import {
  TTS_VOICE_PRESETS,
  DEFAULT_TTS_SETTINGS,
  type TtsSettingsShape,
} from '@thesteamerzone/shared';
import { getSupabase } from '../lib/supabase';
import { legacySamplePath } from '../lib/legacySamples';
import { connectorUrl, api } from '../lib/connector';
import { speakWebSpeech } from '../lib/ttsWebSpeech';

export function VoicePage() {
  const hasEnv = !!getSupabase();
  const [settings, setSettings] = useState<TtsSettingsShape>({ ...DEFAULT_TTS_SETTINGS });
  const [googleOk, setGoogleOk] = useState(false);
  const [googleKeyHint, setGoogleKeyHint] = useState<string | null>(null);
  const [googleKeySource, setGoogleKeySource] = useState<'env' | 'saved' | 'none'>(
    'none'
  );
  const [googleKeyInput, setGoogleKeyInput] = useState('');
  const [testText, setTestText] = useState('สวัสดีครับ ยินดีต้อนรับสู่ TheSteamerZone');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<{
      voice_id?: string;
      rate?: number;
      pitch?: number;
      volume?: number;
      read_chat?: boolean;
      read_gifts?: boolean;
      chat_template?: string;
      gift_template?: string;
      engine_order?: string[];
      googleConfigured?: boolean;
      googleKeyHint?: string | null;
      googleKeySource?: 'env' | 'saved' | 'none';
    }>(`${connectorUrl()}/api/tts/settings`)
      .then((d) => {
        setSettings({
          ...DEFAULT_TTS_SETTINGS,
          engine_order: d.engine_order ?? DEFAULT_TTS_SETTINGS.engine_order,
          voice_id: d.voice_id ?? DEFAULT_TTS_SETTINGS.voice_id,
          rate: d.rate ?? 1,
          pitch: d.pitch ?? 0,
          volume: d.volume ?? 1,
          read_chat: !!d.read_chat,
          read_gifts: !!d.read_gifts,
          chat_template: d.chat_template ?? DEFAULT_TTS_SETTINGS.chat_template,
          gift_template: d.gift_template ?? DEFAULT_TTS_SETTINGS.gift_template,
        });
        setGoogleOk(!!d.googleConfigured);
        setGoogleKeyHint(d.googleKeyHint ?? null);
        setGoogleKeySource(d.googleKeySource ?? 'none');
        setGoogleKeyInput('');
      })
      .catch(() => setStatus('เปิด Connector ก่อน (หน้าเชื่อมต่อ)'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      await api(`${connectorUrl()}/api/tts/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setStatus('บันทึกแล้ว');
      load();
    } catch {
      setStatus('บันทึกไม่สำเร็จ — ตรวจ Connector');
    } finally {
      setSaving(false);
    }
  }

  async function saveGoogleKey() {
    if (!googleKeyInput.trim()) {
      setStatus('วาง API Key ก่อน หรือกดลบคีย์ที่บันทึกไว้');
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await api(`${connectorUrl()}/api/tts/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_api_key: googleKeyInput.trim() }),
      });
      setStatus('บันทึก Google API Key แล้ว (เก็บในเครื่องที่รัน Connector)');
      load();
    } catch {
      setStatus('บันทึกคีย์ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function clearGoogleKey() {
    setSaving(true);
    try {
      await api(`${connectorUrl()}/api/tts/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear_google_api_key: true }),
      });
      setGoogleKeyInput('');
      setStatus('ลบคีย์ที่บันทึกใน Connector แล้ว');
      load();
    } catch {
      setStatus('ลบคีย์ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function testTts() {
    setStatus('กำลังสังเคราะห์…');
    try {
      const res = await api<{
        engine: string;
        audioUrl?: string | null;
        message?: string;
      }>(`${connectorUrl()}/api/tts/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testText, voiceId: settings.voice_id, settings }),
      });
      if (res.audioUrl) {
        const a = new Audio(res.audioUrl);
        a.volume = settings.volume;
        await a.play();
        setStatus(`เล่นแล้ว (${res.engine === 'google_cloud' ? 'Google Neural' : res.engine})`);
      } else {
        speakWebSpeech(testText, {
          voiceId: settings.voice_id,
          rate: settings.rate,
          pitch: settings.pitch + 1,
          volume: settings.volume,
        });
        setStatus(
          res.message ||
            'ใช้ Web Speech ในเบราว์เซอร์ — ใส่ GOOGLE_TTS_API_KEY ใน connector เพื่อเสียงสมจริง'
        );
      }
    } catch {
      speakWebSpeech(testText, {
        voiceId: settings.voice_id,
        rate: settings.rate,
        pitch: settings.pitch + 1,
        volume: settings.volume,
      });
      setStatus('Connector ไม่ตอบ — ทดสอบ Web Speech แทน');
    }
  }

  async function broadcastTest() {
    try {
      await api(`${connectorUrl()}/api/tts/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testText }),
      });
      setStatus('ส่งไปยัง OBS วิดเจ็ต TTS แล้ว (ต้องเปิด overlay)');
    } catch {
      setStatus('ส่ง broadcast ไม่ได้');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">เสียง & TTS</h1>
        <p className="text-sm leading-relaxed text-tsz-muted">
          เลือกโทนเสียงหลายแบบ — แนะนำ <strong className="text-tsz-text">Neural2</strong> สำหรับภาษาไทย
          {googleOk ? (
            <span className="ml-2 text-green-700">· Google TTS พร้อมใช้</span>
          ) : (
            <span className="ml-2 text-amber-800">
              · ไม่มี Google key — ใช้ Web Speech หรือใส่คีย์ด้านล่าง
            </span>
          )}
          {hasEnv ? null : (
            <span className="mt-1 block text-amber-800">Supabase ยังไม่ตั้ง — บันทึก settings เก็บที่ Connector</span>
          )}
        </p>
      </div>

      <section className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-6 shadow-card">
        <h2 className="mb-1 text-sm font-semibold text-tsz-text">ตั้งค่า Google Cloud TTS (ถ้ามี)</h2>
        <p className="mb-4 text-xs leading-relaxed text-tsz-muted">
          ไม่บังคับ — ถ้าไม่ใส่จะใช้ Web Speech ฟรี คีย์เก็บเฉพาะในเครื่องที่รัน Connector
        </p>
        {googleKeySource === 'env' && (
          <p className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
            ใช้คีย์จากไฟล์ <code>.env</code> ของ Connector อยู่แล้ว
            {googleKeyHint ? ` (${googleKeyHint})` : ''}
          </p>
        )}
        {googleKeySource === 'saved' && googleKeyHint && (
          <p className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
            บันทึกคีย์ในเครื่องแล้ว: <strong>{googleKeyHint}</strong>
          </p>
        )}
        <label className="mb-1 block text-xs font-medium text-tsz-muted">
          Google API Key (Cloud Text-to-Speech)
        </label>
        <input
          type="password"
          autoComplete="off"
          className="mb-3 w-full rounded-lg border border-tsz-border bg-white px-3 py-2 font-mono text-sm"
          placeholder="AIzaSy…"
          value={googleKeyInput}
          onChange={(e) => setGoogleKeyInput(e.target.value)}
        />
        <p className="mb-3 text-xs text-tsz-muted">
          Google Cloud Console → เปิด Cloud Text-to-Speech API → Credentials → สร้าง API key
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-tsz-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            disabled={saving}
            onClick={() => void saveGoogleKey()}
          >
            บันทึก API Key
          </button>
          <button
            type="button"
            className="rounded-lg border border-tsz-border bg-white px-4 py-2 text-sm hover:bg-tsz-bg"
            disabled={saving || googleKeySource !== 'saved'}
            onClick={() => void clearGoogleKey()}
          >
            ลบคีย์ที่บันทึก
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold text-tsz-text">เลือกโทนเสียง</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {TTS_VOICE_PRESETS.map((v) => (
            <label
              key={v.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                settings.voice_id === v.id
                  ? 'border-tsz-accent bg-tsz-accent/5 ring-1 ring-tsz-accent'
                  : 'border-tsz-border hover:bg-tsz-bg/50'
              }`}
            >
              <input
                type="radio"
                name="voice"
                className="mt-1"
                checked={settings.voice_id === v.id}
                onChange={() => setSettings((s) => ({ ...s, voice_id: v.id }))}
              />
              <span>
                <span className="block text-sm font-medium text-tsz-text">{v.label}</span>
                <span className="text-xs text-tsz-muted">
                  {v.tier === 'neural' ? 'Neural · สมจริง' : 'Standard'} · {v.languageCode}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold text-tsz-text">ปรับเสียง</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-tsz-muted">ความเร็ว ({settings.rate.toFixed(2)})</span>
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
            <span className="mb-1 block text-xs text-tsz-muted">ระดับเสียง ({settings.pitch})</span>
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
            <span className="mb-1 block text-xs text-tsz-muted">ความดัง ({settings.volume.toFixed(2)})</span>
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
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-6 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-tsz-text">อ่านอัตโนมัติ (TikTok)</h2>
        <div className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.read_chat}
              onChange={(e) =>
                setSettings((s) => ({ ...s, read_chat: e.target.checked }))
              }
            />
            อ่านแชท
          </label>
          <input
            className="w-full rounded-lg border border-tsz-border px-3 py-2 text-sm disabled:opacity-50"
            disabled={!settings.read_chat}
            value={settings.chat_template}
            onChange={(e) =>
              setSettings((s) => ({ ...s, chat_template: e.target.value }))
            }
            placeholder="{nickname} พูดว่า {comment}"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.read_gifts}
              onChange={(e) =>
                setSettings((s) => ({ ...s, read_gifts: e.target.checked }))
              }
            />
            อ่านของขวัญ
          </label>
          <input
            className="w-full rounded-lg border border-tsz-border px-3 py-2 text-sm disabled:opacity-50"
            disabled={!settings.read_gifts}
            value={settings.gift_template}
            onChange={(e) =>
              setSettings((s) => ({ ...s, gift_template: e.target.value }))
            }
            placeholder="ขอบคุณ {nickname} ส่ง {gift}"
          />
        </div>
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-6 shadow-card">
        <h2 className="mb-2 text-sm font-semibold text-tsz-text">ทดสอบ</h2>
        <textarea
          className="mb-3 w-full rounded-lg border border-tsz-border px-3 py-2 text-sm"
          rows={2}
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-tsz-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            onClick={() => void testTts()}
          >
            ทดสอบเสียง
          </button>
          <button
            type="button"
            className="rounded-lg border border-tsz-border px-4 py-2 text-sm hover:bg-tsz-bg"
            onClick={() => void broadcastTest()}
          >
            ส่งไป OBS (TTS widget)
          </button>
          <button
            type="button"
            className="rounded-lg border border-tsz-border px-4 py-2 text-sm hover:bg-tsz-bg"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
        {status && <p className="mt-3 text-xs text-tsz-muted">{status}</p>}
        <p className="mt-4 text-xs text-tsz-muted">
          OBS: เพิ่ม Browser Source URL{' '}
          <code className="rounded bg-tsz-bg px-1">/w/ROOM_ID/tts?token=…</code>
        </p>
      </section>

      <section className="rounded-xl border border-tsz-border bg-tsz-surface p-6 shadow-card">
        <h2 className="mb-2 text-sm font-semibold text-tsz-text">เสียงเอฟเฟ็กต์ WIN (จากโปรเจกต์เดิม)</h2>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs text-tsz-muted">ชนะ / เพิ่มคะแนน</p>
            <audio className="h-10 w-full max-w-md" controls src={legacySamplePath('increment.mp3')} />
          </div>
          <div>
            <p className="mb-1 text-xs text-tsz-muted">แพ้ / ลดคะแนน</p>
            <audio className="h-10 w-full max-w-md" controls src={legacySamplePath('decrement.mp3')} />
          </div>
        </div>
      </section>
    </div>
  );
}
