import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  DEFAULT_TTS_SETTINGS,
  findVoicePreset,
  type TtsEngineId,
  type TtsSettingsShape,
} from '@thesteamerzone/shared';

const CACHE_MAX = 80;

export interface TtsCacheEntry {
  id: string;
  filePath: string;
  mime: string;
  createdAt: number;
}

export type SynthesizeResult = { id: string; audioUrl: string; engine: TtsEngineId };

export function createTtsService(dataDir: string, getApiKey: () => string) {
  const cacheDir = path.join(dataDir, 'tts-cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const memIndex = new Map<string, TtsCacheEntry>();

  function pruneCache() {
    if (memIndex.size <= CACHE_MAX) return;
    const sorted = [...memIndex.values()].sort((a, b) => a.createdAt - b.createdAt);
    while (memIndex.size > CACHE_MAX && sorted.length) {
      const old = sorted.shift()!;
      memIndex.delete(old.id);
      try {
        fs.unlinkSync(old.filePath);
      } catch {
        /* ignore */
      }
    }
  }

  function cacheAudio(b64: string): SynthesizeResult {
    const id = crypto.randomBytes(12).toString('hex');
    const filePath = path.join(cacheDir, `${id}.mp3`);
    fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
    const entry: TtsCacheEntry = {
      id,
      filePath,
      mime: 'audio/mpeg',
      createdAt: Date.now(),
    };
    memIndex.set(id, entry);
    pruneCache();
    return { id, audioUrl: `/api/tts/audio/${id}`, engine: 'google_cloud' };
  }

  async function callGoogleTts(
    text: string,
    settings: TtsSettingsShape,
    opts: { modelName?: string; usePrompt?: boolean }
  ): Promise<SynthesizeResult | null> {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const preset = findVoicePreset(settings.voice_id);
    if (!preset) return null;

    const ssmlGender =
      preset.gender === 'female'
        ? 'FEMALE'
        : preset.gender === 'male'
          ? 'MALE'
          : 'NEUTRAL';

    const voiceName = opts.modelName ? preset.geminiVoice : preset.googleName;
    const prompt =
      settings.tts_prompt?.trim() ||
      preset.stylePrompt ||
      (opts.usePrompt ? 'Say the following naturally.' : undefined);

    const input: Record<string, string> = { text };
    if (prompt && opts.modelName) input.prompt = prompt;

    const voice: Record<string, string> = {
      languageCode: preset.languageCode,
      name: voiceName,
      ssmlGender,
    };
    if (opts.modelName) voice.model_name = opts.modelName;

    const body = {
      input,
      voice,
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: Math.min(2, Math.max(0.25, settings.rate)),
        pitch: Math.min(20, Math.max(-20, settings.pitch)),
        volumeGainDb: Math.min(16, Math.max(-96, (settings.volume - 1) * 6)),
      },
    };

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.warn('[tts] fetch failed', e);
      return null;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn('[tts] Google API', res.status, errText.slice(0, 300));
      return null;
    }

    const json = (await res.json()) as { audioContent?: string };
    if (!json.audioContent) return null;

    const out = cacheAudio(json.audioContent);
    if (opts.modelName?.includes('gemini')) {
      out.engine = opts.modelName.includes('3.1') ? 'gemini_31' : 'gemini_25';
    } else {
      out.engine = 'google_cloud';
    }
    return out;
  }

  async function synthesizeGemini(
    text: string,
    settings: TtsSettingsShape,
    modelName: string,
    engine: TtsEngineId
  ): Promise<SynthesizeResult | null> {
    const out = await callGoogleTts(text, settings, {
      modelName,
      usePrompt: true,
    });
    if (out) out.engine = engine;
    return out;
  }

  async function synthesizeGoogle(
    text: string,
    settings: TtsSettingsShape
  ): Promise<{ id: string; audioUrl: string } | null> {
    const out = await callGoogleTts(text, settings, {});
    return out ? { id: out.id, audioUrl: out.audioUrl } : null;
  }

  /** ลองทุก engine ตามลำดับ (cascade) */
  async function synthesizeCascade(
    text: string,
    settings: TtsSettingsShape,
    order: TtsEngineId[],
    enabled: Partial<Record<TtsEngineId, boolean>>
  ): Promise<SynthesizeResult | null> {
    for (const eng of order) {
      if (enabled[eng] === false) continue;

      if (eng === 'gemini_31' && getApiKey()) {
        for (const model of [
          'gemini-2.5-flash-tts',
          'gemini-2.5-flash-lite-preview-tts',
          'gemini-2.5-pro-tts',
        ]) {
          const out = await synthesizeGemini(text, settings, model, 'gemini_31');
          if (out) return out;
        }
      }

      if (eng === 'gemini_25' && getApiKey()) {
        const out = await synthesizeGemini(
          text,
          settings,
          'gemini-2.5-flash-tts',
          'gemini_25'
        );
        if (out) return out;
      }

      if (eng === 'google_cloud' && getApiKey()) {
        const out = await synthesizeGoogle(text, settings);
        if (out) {
          return { ...out, engine: 'google_cloud' };
        }
      }

      if (eng === 'web_speech') {
        return null;
      }
    }
    return null;
  }

  function getAudioEntry(id: string): TtsCacheEntry | null {
    const safe = id.replace(/[^a-f0-9]/gi, '');
    return memIndex.get(safe) ?? null;
  }

  function loadSettingsFile(dataDir: string): TtsSettingsShape {
    const p = path.join(dataDir, 'tts-settings.json');
    try {
      if (fs.existsSync(p)) {
        return { ...DEFAULT_TTS_SETTINGS, ...JSON.parse(fs.readFileSync(p, 'utf8')) };
      }
    } catch {
      /* ignore */
    }
    return { ...DEFAULT_TTS_SETTINGS };
  }

  function saveSettingsFile(dataDir: string, settings: TtsSettingsShape) {
    const p = path.join(dataDir, 'tts-settings.json');
    fs.writeFileSync(p, JSON.stringify(settings, null, 2), 'utf8');
  }

  return {
    synthesizeGoogle,
    synthesizeGemini,
    synthesizeCascade,
    getAudioEntry,
    loadSettingsFile,
    saveSettingsFile,
    cacheDir,
  };
}

export type TtsService = ReturnType<typeof createTtsService>;
