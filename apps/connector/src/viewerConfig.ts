import fs from 'node:fs';
import path from 'node:path';

export type VipUser = {
  username: string;
  displayName?: string;
  soundFile?: string;
};

export type ViewerConfigFile = {
  enabled: boolean;
  volume: number;
  trackedUsers: VipUser[];
  soundFiles: string[];
};

const FILE = 'viewer-config.json';

export const defaultViewerConfig = (): ViewerConfigFile => ({
  enabled: true,
  volume: 0.7,
  trackedUsers: [],
  soundFiles: ['increment.mp3', 'decrement.mp3'],
});

export function loadViewerConfig(dir: string): ViewerConfigFile {
  const p = path.join(dir, FILE);
  if (!fs.existsSync(p)) {
    const d = defaultViewerConfig();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');
    return d;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as ViewerConfigFile;
    return {
      ...defaultViewerConfig(),
      ...raw,
      trackedUsers: Array.isArray(raw.trackedUsers) ? raw.trackedUsers : [],
      soundFiles: Array.isArray(raw.soundFiles) ? raw.soundFiles : [],
    };
  } catch {
    return defaultViewerConfig();
  }
}

export function saveViewerConfig(
  dir: string,
  cfg: ViewerConfigFile
): ViewerConfigFile {
  const p = path.join(dir, FILE);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8');
  return cfg;
}

export function soundsDir(dir: string) {
  return path.join(dir, 'sounds');
}

export function listSoundFiles(dir: string): string[] {
  const sd = soundsDir(dir);
  fs.mkdirSync(sd, { recursive: true });
  const builtIn = ['increment.mp3', 'decrement.mp3'];
  const uploaded = fs
    .readdirSync(sd)
    .filter((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f));
  return [...new Set([...builtIn, ...uploaded])].sort();
}
