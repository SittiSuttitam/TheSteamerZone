import { findVoicePreset, type TtsVoicePreset } from '@thesteamerzone/shared';

function pickThaiVoice(preset: TtsVoicePreset | undefined): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const lang = preset?.languageCode?.slice(0, 2) || 'th';
  const gender = preset?.gender;

  const thai = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  if (!thai.length) {
    return voices.find((v) => v.lang.toLowerCase().startsWith('th')) ?? voices[0];
  }

  if (gender === 'female') {
    return (
      thai.find((v) => /female|woman|girl/i.test(v.name)) ??
      thai.find((v) => !/male|man|boy/i.test(v.name)) ??
      thai[0]
    );
  }
  if (gender === 'male') {
    return (
      thai.find((v) => /male|man|boy/i.test(v.name)) ??
      thai.find((v) => !/female|woman|girl/i.test(v.name)) ??
      thai[0]
    );
  }
  return thai[0];
}

export function speakWebSpeech(
  text: string,
  opts: { voiceId?: string; rate?: number; pitch?: number; volume?: number }
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const preset = opts.voiceId ? findVoicePreset(opts.voiceId) : undefined;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = preset?.languageCode ?? 'th-TH';
  u.rate = Math.min(2, Math.max(0.5, opts.rate ?? 1));
  u.pitch = Math.min(2, Math.max(0, opts.pitch ?? 1));
  u.volume = Math.min(1, Math.max(0, opts.volume ?? 1));
  const voice = pickThaiVoice(preset);
  if (voice) u.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
