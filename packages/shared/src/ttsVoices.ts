/** โทนเสียง TTS — Google Cloud (Neural2 แนะนำสำหรับภาษาไทย) */
export interface TtsVoicePreset {
  id: string;
  label: string;
  labelEn: string;
  languageCode: string;
  /** ชื่อ voice ใน Google Cloud Text-to-Speech */
  googleName: string;
  gender: 'female' | 'male' | 'neutral';
  tier: 'neural' | 'standard' | 'wavenet';
}

export const TTS_VOICE_PRESETS: TtsVoicePreset[] = [
  {
    id: 'th-female-warm',
    label: 'หญิง อบอุ่น',
    labelEn: 'Thai Female Warm',
    languageCode: 'th-TH',
    googleName: 'th-TH-Neural2-C',
    gender: 'female',
    tier: 'neural',
  },
  {
    id: 'th-male-calm',
    label: 'ชาย สุขุม',
    labelEn: 'Thai Male Calm',
    languageCode: 'th-TH',
    googleName: 'th-TH-Neural2-B',
    gender: 'male',
    tier: 'neural',
  },
  {
    id: 'th-female-clear',
    label: 'หญิง ชัดเจน',
    labelEn: 'Thai Female Clear',
    languageCode: 'th-TH',
    googleName: 'th-TH-Standard-A',
    gender: 'female',
    tier: 'standard',
  },
  {
    id: 'th-male-standard',
    label: 'ชาย มาตรฐาน',
    labelEn: 'Thai Male Standard',
    languageCode: 'th-TH',
    googleName: 'th-TH-Standard-B',
    gender: 'male',
    tier: 'standard',
  },
  {
    id: 'en-female-natural',
    label: 'อังกฤษ หญิง (ธรรมชาติ)',
    labelEn: 'English Female Natural',
    languageCode: 'en-US',
    googleName: 'en-US-Neural2-F',
    gender: 'female',
    tier: 'neural',
  },
  {
    id: 'en-male-natural',
    label: 'อังกฤษ ชาย (ธรรมชาติ)',
    labelEn: 'English Male Natural',
    languageCode: 'en-US',
    googleName: 'en-US-Neural2-D',
    gender: 'male',
    tier: 'neural',
  },
  {
    id: 'ja-female',
    label: 'ญี่ปุ่น หญิง',
    labelEn: 'Japanese Female',
    languageCode: 'ja-JP',
    googleName: 'ja-JP-Neural2-B',
    gender: 'female',
    tier: 'neural',
  },
];

export function findVoicePreset(id: string): TtsVoicePreset | undefined {
  return TTS_VOICE_PRESETS.find((v) => v.id === id);
}

export const DEFAULT_TTS_VOICE_ID = 'th-female-warm';

export interface TtsSettingsShape {
  engine_order: string[];
  voice_id: string;
  rate: number;
  pitch: number;
  volume: number;
  read_chat: boolean;
  read_gifts: boolean;
  chat_template: string;
  gift_template: string;
  /** เก็บใน Connector เครื่องผู้ใช้เท่านั้น — ไม่ส่งกลับใน API แบบเต็ม */
  google_api_key?: string;
}

export const DEFAULT_TTS_SETTINGS: TtsSettingsShape = {
  engine_order: ['google_cloud', 'web_speech'],
  voice_id: DEFAULT_TTS_VOICE_ID,
  rate: 1,
  pitch: 0,
  volume: 1,
  read_chat: false,
  read_gifts: false,
  chat_template: '{nickname} พูดว่า {comment}',
  gift_template: 'ขอบคุณ {nickname} ส่ง {gift}',
};
