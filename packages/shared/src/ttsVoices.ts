import type { TtsEngineId } from './ttsEngines.js';

/** โทนเสียง — จับคู่กับเสียงใน Windows / Web Speech */
export interface TtsVoicePreset {
  id: string;
  label: string;
  labelEn: string;
  region: 'th' | 'en' | 'ja' | 'zh' | 'other';
  languageCode: string;
  gender: 'female' | 'male';
  tier: 'studio' | 'standard' | 'chirp' | 'neural';
  flag: string;
  /** เสียงใน Google Cloud (classic) */
  googleName: string;
  /** ชื่อ speaker ใน Gemini-TTS (Kore, Charon, …) */
  geminiVoice: string;
  stylePrompt?: string;
  /** คำในชื่อเสียง Windows/Chrome สำหรับจับคู่ Web Speech */
  webSpeechHints?: string[];
}

export const TTS_VOICE_PRESETS: TtsVoicePreset[] = [
  // —— ไทย ——
  {
    id: 'th-premwadee',
    label: 'Premwadee',
    labelEn: 'Thai Female Studio',
    region: 'th',
    languageCode: 'th-TH',
    gender: 'female',
    tier: 'studio',
    flag: '🇹🇭',
    googleName: 'th-TH-Chirp3-HD-Aoede',
    geminiVoice: 'Aoede',
    stylePrompt: 'พูดภาษาไทยอย่างเป็นธรรมชาติ น้ำเสียงอบอุ่น เป็นมิตร เหมาะกับสตรีมไลฟ์',
    webSpeechHints: ['premwadee', 'pattara', 'female'],
  },
  {
    id: 'th-niwat',
    label: 'Niwat',
    labelEn: 'Thai Male Studio',
    region: 'th',
    languageCode: 'th-TH',
    gender: 'male',
    tier: 'studio',
    flag: '🇹🇭',
    googleName: 'th-TH-Chirp3-HD-Charon',
    geminiVoice: 'Charon',
    stylePrompt: 'พูดภาษาไทยอย่างสุขุม ชัดเจน น้ำเสียงผู้ชายเป็นมิตร',
    webSpeechHints: ['niwat', 'male'],
  },
  {
    id: 'th-standard',
    label: 'Standard',
    labelEn: 'Thai Cloud Standard',
    region: 'th',
    languageCode: 'th-TH',
    gender: 'female',
    tier: 'standard',
    flag: '🇹🇭',
    googleName: 'th-TH-Neural2-C',
    geminiVoice: 'Kore',
    stylePrompt: 'พูดภาษาไทยชัดเจน',
    webSpeechHints: ['thai', 'female'],
  },
  {
    id: 'th-female-chirp',
    label: 'ไทย HD หญิง',
    labelEn: 'Thai Female Chirp',
    region: 'th',
    languageCode: 'th-TH',
    gender: 'female',
    tier: 'chirp',
    flag: '🇹🇭',
    googleName: 'th-TH-Chirp3-HD-Zephyr',
    geminiVoice: 'Zephyr',
    webSpeechHints: ['female', 'th-TH'],
  },
  {
    id: 'th-male-chirp',
    label: 'ไทย HD ชาย',
    labelEn: 'Thai Male Chirp',
    region: 'th',
    languageCode: 'th-TH',
    gender: 'male',
    tier: 'chirp',
    flag: '🇹🇭',
    googleName: 'th-TH-Chirp3-HD-Puck',
    geminiVoice: 'Puck',
    webSpeechHints: ['male', 'th-TH'],
  },
  // —— อังกฤษ ——
  {
    id: 'en-aria',
    label: 'Aria',
    labelEn: 'English Female',
    region: 'en',
    languageCode: 'en-US',
    gender: 'female',
    tier: 'studio',
    flag: '🇺🇸',
    googleName: 'en-US-Neural2-F',
    geminiVoice: 'Aoede',
    stylePrompt: 'Speak in natural American English, friendly tone.',
    webSpeechHints: ['aria', 'jenny', 'zira', 'female', 'en-US'],
  },
  {
    id: 'en-jenny',
    label: 'Jenny',
    labelEn: 'English Female 2',
    region: 'en',
    languageCode: 'en-US',
    gender: 'female',
    tier: 'studio',
    flag: '🇺🇸',
    googleName: 'en-US-Neural2-C',
    geminiVoice: 'Kore',
    stylePrompt: 'Speak in clear American English.',
    webSpeechHints: ['jenny', 'aria', 'female', 'en-US'],
  },
  {
    id: 'en-guy',
    label: 'Guy',
    labelEn: 'English Male',
    region: 'en',
    languageCode: 'en-US',
    gender: 'male',
    tier: 'studio',
    flag: '🇺🇸',
    googleName: 'en-US-Neural2-D',
    geminiVoice: 'Charon',
    stylePrompt: 'Speak in natural American English, calm male voice.',
    webSpeechHints: ['guy', 'david', 'mark', 'male', 'en-US'],
  },
  // —— ญี่ปุ่น / จีน ——
  {
    id: 'ja-nanami',
    label: 'Nanami',
    labelEn: 'Japanese Female',
    region: 'ja',
    languageCode: 'ja-JP',
    gender: 'female',
    tier: 'studio',
    flag: '🇯🇵',
    googleName: 'ja-JP-Neural2-B',
    geminiVoice: 'Kore',
    stylePrompt: '自然な日本語で話してください。',
    webSpeechHints: ['nanami', 'ichiro', 'ja-JP', 'japanese'],
  },
  {
    id: 'zh-xiaoxiao',
    label: 'Xiaoxiao',
    labelEn: 'Mandarin Female',
    region: 'zh',
    languageCode: 'cmn-CN',
    gender: 'female',
    tier: 'studio',
    flag: '🇨🇳',
    googleName: 'cmn-CN-Wavenet-A',
    geminiVoice: 'Aoede',
    stylePrompt: '用自然的中文普通话朗读。',
    webSpeechHints: ['xiaoxiao', 'yunxi', 'zh-CN', 'chinese', 'mandarin'],
  },
];

export function findVoicePreset(id: string): TtsVoicePreset | undefined {
  return TTS_VOICE_PRESETS.find((v) => v.id === id);
}

export const DEFAULT_TTS_VOICE_ID = 'th-premwadee';

export const TTS_SAMPLE_TEXT: Record<string, string> = {
  th: 'สวัสดีครับ ยินดีต้อนรับสู่ไลฟ์สตรีม',
  en: 'Hello everyone, welcome to the stream!',
  ja: 'みなさん、こんにちは。配信へようこそ。',
  zh: '大家好，欢迎来到直播间。',
};

export interface TtsSettingsShape {
  engine_order: string[];
  /** เปิด/ปิดแต่ละ engine */
  engines_enabled?: Partial<Record<TtsEngineId, boolean>>;
  voice_id: string;
  /** voiceURI จาก Web Speech API — ถ้ามีจะใช้เสียงนี้โดยตรง */
  system_voice_uri?: string;
  rate: number;
  pitch: number;
  volume: number;
  read_chat: boolean;
  read_gifts: boolean;
  chat_template: string;
  gift_template: string;
  google_api_key?: string;
  /** Gemini style (optional override) */
  tts_prompt?: string;
}

export const DEFAULT_TTS_SETTINGS: TtsSettingsShape = {
  engine_order: ['web_speech'],
  engines_enabled: {
    web_speech: true,
  },
  voice_id: DEFAULT_TTS_VOICE_ID,
  rate: 1,
  pitch: 0,
  volume: 1,
  read_chat: false,
  read_gifts: false,
  chat_template: '{nickname} พูดว่า {comment}',
  gift_template: 'ขอบคุณ {nickname} ส่ง {gift}',
};

export function voicesByRegion(region: TtsVoicePreset['region']) {
  return TTS_VOICE_PRESETS.filter((v) => v.region === region);
}

export function tierLabel(tier: TtsVoicePreset['tier']): string {
  switch (tier) {
    case 'studio':
      return 'Studio';
    case 'chirp':
      return 'HD';
    case 'neural':
      return 'Neural';
    default:
      return 'Standard';
  }
}
