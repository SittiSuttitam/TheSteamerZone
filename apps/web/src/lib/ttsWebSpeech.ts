import { findVoicePreset, type TtsVoicePreset } from '@thesteamerzone/shared';

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** รอให้เบราว์เซอร์โหลดรายชื่อเสียง (สำคัญบน Chrome/Edge) */
export async function ensureSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return [];
  }

  const tryGet = () => window.speechSynthesis.getVoices();
  let list = tryGet();
  if (list.length > 0) return list;

  if (!voicesReady) {
    voicesReady = (async () => {
      for (let i = 0; i < 6; i++) {
        await new Promise<void>((resolve) => {
          const finish = () => resolve();
          window.speechSynthesis.onvoiceschanged = finish;
          setTimeout(finish, 200 + i * 150);
        });
        list = tryGet();
        if (list.length > 0) return list;
      }
      return tryGet();
    })();
  }
  return voicesReady;
}

export interface SystemVoiceOption {
  uri: string;
  name: string;
  lang: string;
  local: boolean;
  default: boolean;
}

export function toSystemVoiceOption(v: SpeechSynthesisVoice): SystemVoiceOption {
  return {
    uri: v.voiceURI,
    name: v.name,
    lang: v.lang,
    local: v.localService,
    default: v.default,
  };
}

export function findSystemVoiceByUri(
  voices: SpeechSynthesisVoice[],
  uri: string | undefined
): SpeechSynthesisVoice | null {
  if (!uri) return null;
  const hit = voices.find((v) => v.voiceURI === uri);
  if (hit) return hit;
  return voices.find((v) => v.name === uri) ?? null;
}

/** จัดกลุ่มตามภาษา สำหรับ dropdown */
/** เสียงแนะนำ — Siri ไม่มีใน Web Speech (แม้บน Mac) */
export function recommendVoices(voices: SpeechSynthesisVoice[]): {
  siri: SpeechSynthesisVoice | null;
  thFemale: SpeechSynthesisVoice | null;
  thMale: SpeechSynthesisVoice | null;
  enFemale: SpeechSynthesisVoice | null;
} {
  const match = (...parts: string[]) =>
    voices.find((v) => {
      const n = v.name.toLowerCase();
      return parts.some((p) => n.includes(p));
    }) ?? null;

  return {
    siri: match('siri'),
    thFemale: match('premwadee', 'pattara', 'thai') ?? voices.find((v) => v.lang.startsWith('th')) ?? null,
    thMale: match('niwat'),
    enFemale: match('aria', 'jenny', 'zira', 'samantha', 'natural'),
  };
}

export function groupVoicesByLang(
  voices: SpeechSynthesisVoice[]
): { lang: string; voices: SpeechSynthesisVoice[] }[] {
  const map = new Map<string, SpeechSynthesisVoice[]>();
  for (const v of voices) {
    const key = v.lang || '—';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([lang, vs]) => ({
      lang,
      voices: vs.sort((x, y) => x.name.localeCompare(y.name)),
    }));
}

function scoreVoice(v: SpeechSynthesisVoice, preset: TtsVoicePreset): number {
  const lang = preset.languageCode.toLowerCase();
  const vl = v.lang.toLowerCase();
  if (!vl.startsWith(lang.slice(0, 2))) return -100;

  let score = vl.startsWith(lang) ? 10 : 5;
  const name = v.name.toLowerCase();

  for (const hint of preset.webSpeechHints ?? []) {
    if (name.includes(hint.toLowerCase())) score += 14;
  }

  if (preset.gender === 'female') {
    if (/female|woman|girl|pattara|narisa|siri|kanya|premwadee|aria|jenny|nanami|xiaoxiao/i.test(name)) {
      score += 8;
    }
    if (/male|man|boy|niwat|guy|puck|charon/i.test(name)) score -= 6;
  } else if (preset.gender === 'male') {
    if (/male|man|boy|niwat|guy|puck|charon/i.test(name)) score += 8;
    if (/female|woman|girl|premwadee|pattara|aria|jenny/i.test(name)) score -= 6;
  }

  if (v.default && score < 8) score += 1;
  return score;
}

export function pickWebSpeechVoice(
  voices: SpeechSynthesisVoice[],
  preset: TtsVoicePreset | undefined
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  if (!preset) {
    return voices.find((v) => v.lang.toLowerCase().startsWith('th')) ?? voices[0] ?? null;
  }

  const ranked = voices
    .map((v) => ({ v, score: scoreVoice(v, preset) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length) return ranked[0]!.v;

  const lang = preset.languageCode.slice(0, 2);
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
}

export async function resolveSpeechVoice(opts: {
  voiceId?: string;
  systemVoiceUri?: string;
}): Promise<{ voice: SpeechSynthesisVoice; error?: undefined } | { voice?: undefined; error: string }> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return { error: 'เบราว์เซอร์ไม่รองรับการอ่านออกเสียง' };
  }

  const voices = await ensureSpeechVoices();
  if (!voices.length) {
    return {
      error: 'ยังไม่มีเสียงในระบบ — ติดตั้งภาษาใน Windows แล้วรีสตาร์ทเบราว์เซอร์',
    };
  }

  if (opts.systemVoiceUri) {
    const direct = findSystemVoiceByUri(voices, opts.systemVoiceUri);
    if (direct) return { voice: direct };
    return { error: 'ไม่พบเสียงที่เลือก — เลือกใหม่จากรายการ' };
  }

  const preset = opts.voiceId ? findVoicePreset(opts.voiceId) : undefined;
  const voice = pickWebSpeechVoice(voices, preset);
  if (!voice) {
    const lang = preset?.languageCode ?? 'th-TH';
    return {
      error: `ไม่มีเสียงภาษา ${lang} ในเครื่อง — ไปที่ Settings → Time & Language → Speech → Add voices`,
    };
  }

  return { voice };
}

/** @deprecated ใช้ resolveSpeechVoice */
export async function checkVoiceReady(
  voiceId?: string,
  systemVoiceUri?: string
): Promise<{ ok: boolean; voice?: SpeechSynthesisVoice; error?: string }> {
  const r = await resolveSpeechVoice({ voiceId, systemVoiceUri });
  if (r.voice) return { ok: true, voice: r.voice };
  return { ok: false, error: r.error };
}

export function webSpeechPitch(pitch: number): number {
  return Math.min(2, Math.max(0.5, 1 + pitch / 20));
}

export interface SpeakWebSpeechResult {
  voiceName: string;
  voiceLang: string;
}

export async function speakWebSpeech(
  text: string,
  opts: {
    voiceId?: string;
    systemVoiceUri?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  }
): Promise<SpeakWebSpeechResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('ไม่มีข้อความให้อ่าน');
  }

  const resolved = await resolveSpeechVoice({
    voiceId: opts.systemVoiceUri ? undefined : opts.voiceId,
    systemVoiceUri: opts.systemVoiceUri,
  });
  if (!resolved.voice) {
    throw new Error(resolved.error ?? 'เลือกเสียงไม่ได้');
  }

  const voice = resolved.voice;
  const preset = opts.voiceId && !opts.systemVoiceUri ? findVoicePreset(opts.voiceId) : undefined;

  window.speechSynthesis.cancel();
  await delay(80);

  return new Promise((resolve, reject) => {
    let started = false;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      fn();
    };

    const watchdog = setTimeout(() => {
      if (!started) {
        window.speechSynthesis.cancel();
        finish(() =>
          reject(
            new Error(
              `เสียงไม่เริ่มเล่น (${voice.name}) — ลองรีเฟรชหน้า หรือเลือกเสียงอื่น`
            )
          )
        );
      }
    }, 6000);

    const u = new SpeechSynthesisUtterance(trimmed);
    u.lang = voice.lang || preset?.languageCode || 'th-TH';
    u.rate = Math.min(2, Math.max(0.5, opts.rate ?? 1));
    u.pitch = webSpeechPitch(opts.pitch ?? 0);
    u.volume = Math.min(1, Math.max(0, opts.volume ?? 1));
    u.voice = voice;

    u.onstart = () => {
      started = true;
    };
    u.onend = () => {
      finish(() => resolve({ voiceName: voice.name, voiceLang: voice.lang }));
    };
    u.onerror = (ev) => {
      const code = (ev as SpeechSynthesisErrorEvent).error;
      finish(() =>
        reject(new Error(code ? `อ่านไม่สำเร็จ: ${code}` : 'อ่านไม่สำเร็จ'))
      );
    };

    window.speechSynthesis.speak(u);

    setTimeout(() => {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 120);
  });
}
