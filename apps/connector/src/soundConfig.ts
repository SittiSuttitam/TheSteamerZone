import fs from 'node:fs';
import path from 'node:path';

export interface SoundConfigFile {
  incrementFile: string;
  decrementFile: string;
}

const FILE = 'sound-config.json';

export const defaultSoundConfig = (): SoundConfigFile => ({
  incrementFile: 'increment.mp3',
  decrementFile: 'decrement.mp3',
});

export function loadSoundConfig(dir: string): SoundConfigFile {
  const p = path.join(dir, FILE);
  if (!fs.existsSync(p)) {
    const d = defaultSoundConfig();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');
    return d;
  }
  try {
    return { ...defaultSoundConfig(), ...JSON.parse(fs.readFileSync(p, 'utf8')) };
  } catch {
    return defaultSoundConfig();
  }
}

export function saveSoundConfig(dir: string, cfg: SoundConfigFile): SoundConfigFile {
  const p = path.join(dir, FILE);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8');
  return cfg;
}
