/** รูปแบบกฎของขวัญที่ใช้ร่วมกัน web + connector */

export type GiftMappingShape = {
  id?: string;
  giftId?: string;
  giftName?: string;
  name?: string;
  action: 'win' | 'key';
  value?: number;
  multiplier?: number;
  keyCombo?: string;
  enabled?: boolean;
};

export type WheelItemShape = {
  label: string;
  weight: number;
  action: string;
  value: number;
  effect?: string;
};

export type WheelConfigShape = {
  enabled: boolean;
  room?: string;
  triggerIds?: string[];
  triggerGiftIds?: string[];
  scale?: number;
  spinMs?: number;
  resultMs?: number;
  playSpinSound?: boolean;
  playResultSound?: boolean;
  items: WheelItemShape[];
};

export type GiftConfigShape = {
  enabled: boolean;
  mockEnabled?: boolean;
  roomId?: string;
  mappings: GiftMappingShape[];
  wheel: WheelConfigShape;
};

export type LeaderboardEntry = {
  userId: string;
  nickname: string;
  score: number;
};

export type LiveStateExtras = {
  topDonors: LeaderboardEntry[];
  topLikers: LeaderboardEntry[];
  totalLikes: number;
  likeGoal: number | null;
};

export const DEFAULT_WHEEL_ITEMS: WheelItemShape[] = [
  { label: '+5', weight: 1, action: 'win', value: 5, effect: 'good' },
  { label: '+3', weight: 1, action: 'win', value: 3, effect: 'good' },
  { label: '+1', weight: 1, action: 'win', value: 1, effect: 'good' },
  { label: '0', weight: 1, action: 'win', value: 0, effect: 'neutral' },
  { label: '-1', weight: 1, action: 'win', value: -1, effect: 'bad' },
];

export function defaultGiftConfig(): GiftConfigShape {
  return {
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
  };
}

/** รวมค่าที่บันทึกจาก DB / API ให้ครบฟิลด์ */
export function normalizeGiftConfig(raw: unknown): GiftConfigShape {
  const base = defaultGiftConfig();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const wheelRaw =
    o.wheel && typeof o.wheel === 'object'
      ? (o.wheel as Record<string, unknown>)
      : {};
  return {
    ...base,
    ...o,
    enabled: o.enabled !== false,
    mockEnabled: o.mockEnabled !== false,
    roomId: typeof o.roomId === 'string' ? o.roomId : base.roomId,
    mappings: Array.isArray(o.mappings)
      ? (o.mappings as GiftMappingShape[])
      : base.mappings,
    wheel: {
      ...base.wheel,
      ...wheelRaw,
      items: Array.isArray(wheelRaw.items)
        ? (wheelRaw.items as WheelItemShape[])
        : base.wheel.items,
    },
  };
}
