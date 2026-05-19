import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface GiftMapping {
  id?: string;
  giftId?: string;
  giftName?: string;
  name?: string;
  action: 'win' | 'key';
  value?: number;
  multiplier?: number;
  keyCombo?: string;
  enabled?: boolean;
}

export interface WheelConfig {
  enabled: boolean;
  room?: string;
  triggerIds?: string[];
  triggerGiftIds?: string[];
  scale?: number;
  spinMs?: number;
  resultMs?: number;
  playSpinSound?: boolean;
  playResultSound?: boolean;
  items: Array<{
    label: string;
    weight: number;
    action: string;
    value: number;
    effect?: string;
  }>;
}

export interface GiftConfigFile {
  enabled: boolean;
  mockEnabled?: boolean;
  roomId?: string;
  mappings: GiftMapping[];
  wheel: WheelConfig;
}

const DEFAULT_WHEEL_ITEMS: WheelConfig['items'] = [
  { label: '+5', weight: 1, action: 'win', value: 5, effect: 'good' },
  { label: '+3', weight: 1, action: 'win', value: 3, effect: 'good' },
  { label: '+1', weight: 1, action: 'win', value: 1, effect: 'good' },
  { label: '0', weight: 1, action: 'win', value: 0, effect: 'neutral' },
  { label: '-1', weight: 1, action: 'win', value: -1, effect: 'bad' },
];

export const defaultGiftConfig = (): GiftConfigFile => ({
  enabled: true,
  mockEnabled: true,
  roomId: '',
  mappings: [
    {
      giftId: '5655',
      name: 'Rose',
      action: 'win',
      value: 1,
      multiplier: 1,
      enabled: true,
    },
  ],
  wheel: {
    enabled: false,
    room: 'default',
    triggerIds: ['5655'],
    scale: 1,
    spinMs: 5000,
    resultMs: 5000,
    playSpinSound: false,
    playResultSound: false,
    items: DEFAULT_WHEEL_ITEMS,
  },
});

export function getDataDir(explicit?: string): string {
  if (explicit) return explicit;
  const base =
    process.platform === 'win32'
      ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
      : path.join(os.homedir(), '.config');
  return path.join(base, 'TheSteamerZone');
}

export function loadGiftConfig(dir: string): GiftConfigFile {
  const p = path.join(dir, 'gift-config.json');
  if (!fs.existsSync(p)) {
    const d = defaultGiftConfig();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');
    return d;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as GiftConfigFile;
    return { ...defaultGiftConfig(), ...raw, wheel: { ...defaultGiftConfig().wheel, ...raw.wheel } };
  } catch {
    return defaultGiftConfig();
  }
}

export function saveGiftConfig(dir: string, cfg: GiftConfigFile) {
  const p = path.join(dir, 'gift-config.json');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8');
}
