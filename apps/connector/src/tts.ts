import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  DEFAULT_TTS_SETTINGS,
  findVoicePreset,
  type TtsSettingsShape,
} from '@thesteamerzone/shared';

const CACHE_MAX = 80;

export interface TtsCacheEntry {
  id: string;
  filePath: string;
  mime: string;
  createdAt: number;
}

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

  async function synthesizeGoogle(
    text: string,
    settings: TtsSettingsShape
  ): Promise<{ id: string; audioUrl: string } | null> {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const preset = findVoicePreset(settings.voice_id);
    if (!preset) return null;

    const body = {
      input: { text },
      voice: {
        languageCode: preset.languageCode,
        name: preset.googleName,
      },
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
      console.warn('[tts] Google API', res.status, errText.slice(0, 200));
      return null;
    }

    const json = (await res.json()) as { audioContent?: string };
    if (!json.audioContent) return null;

    const id = crypto.randomBytes(12).toString('hex');
    const filePath = path.join(cacheDir, `${id}.mp3`);
    fs.writeFileSync(filePath, Buffer.from(json.audioContent, 'base64'));
    const entry: TtsCacheEntry = {
      id,
      filePath,
      mime: 'audio/mpeg',
      createdAt: Date.now(),
    };
    memIndex.set(id, entry);
    pruneCache();
    return { id, audioUrl: `/api/tts/audio/${id}` };
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
    getAudioEntry,
    loadSettingsFile,
    saveSettingsFile,
    cacheDir,
  };
}

export type TtsService = ReturnType<typeof createTtsService>;
