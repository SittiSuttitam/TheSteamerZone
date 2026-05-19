/** Engine IDs — ปัจจุบันใช้ web_speech (เสียงระบบ) เป็นหลัก */
export type TtsEngineId =
  | 'gemini_31'
  | 'gemini_25'
  | 'google_cloud'
  | 'web_speech';

export interface TtsEngineMeta {
  id: TtsEngineId;
  label: string;
  emoji: string;
  description: string;
  needsGoogleKey: boolean;
  premium?: boolean;
}

export const TTS_ENGINES: TtsEngineMeta[] = [
  {
    id: 'gemini_31',
    label: 'Gemini 3.1 Flash TTS',
    emoji: '✨',
    description: 'เสียงสมจริงสูง · ต้องมี Google API Key',
    needsGoogleKey: true,
    premium: true,
  },
  {
    id: 'gemini_25',
    label: 'Gemini 2.5 Flash TTS',
    emoji: '🌟',
    description: 'คุณภาพดี เร็ว · ต้องมี Google API Key',
    needsGoogleKey: true,
    premium: true,
  },
  {
    id: 'google_cloud',
    label: 'Google Cloud TTS',
    emoji: '🔑',
    description: 'Neural / Chirp / Standard · ต้องมี API Key',
    needsGoogleKey: true,
  },
  {
    id: 'web_speech',
    label: 'เสียงพื้นฐาน (เบราว์เซอร์)',
    emoji: '🔊',
    description: 'ฟรี · ไม่ต้องใส่ key · คุณภาพขึ้นกับ Windows/macOS',
    needsGoogleKey: false,
  },
];

export const GEMINI_MODELS: Record<'gemini_31' | 'gemini_25', string[]> = {
  gemini_31: ['gemini-2.5-flash-tts', 'gemini-2.5-pro-tts'],
  gemini_25: ['gemini-2.5-flash-tts'],
};

/** ค่าเริ่มต้น — ลอง Premium ก่อน แล้วค่อย fallback */
export const DEFAULT_ENGINE_ORDER: TtsEngineId[] = ['web_speech'];

export function normalizeEngineOrder(order?: string[]): TtsEngineId[] {
  const valid = new Set(TTS_ENGINES.map((e) => e.id));
  const out: TtsEngineId[] = [];
  for (const id of order ?? DEFAULT_ENGINE_ORDER) {
    if (valid.has(id as TtsEngineId) && !out.includes(id as TtsEngineId)) {
      out.push(id as TtsEngineId);
    }
  }
  for (const e of DEFAULT_ENGINE_ORDER) {
    if (!out.includes(e)) out.push(e);
  }
  return out;
}
