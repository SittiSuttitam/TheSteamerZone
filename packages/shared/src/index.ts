export * from './ttsVoices.js';

/** Gift combo key: user_giftId */
export const comboKey = (username: string, giftId: string) =>
  `${username}_${giftId}`;

export interface ComboGiftData {
  coins: number;
  repeatCount: number;
  displayName: string;
  profilePicture: string;
  username: string;
  giftId: string;
  giftName: string;
  timeout?: ReturnType<typeof setTimeout> | null;
}

/** @internal use random weight pick */
export function weightedPick<T extends { weight?: number }>(
  items: T[],
  random: () => number = Math.random
): T {
  const total = items.reduce((s, i) => s + Math.max(0, i.weight ?? 1), 0);
  let r = random() * total;
  for (const item of items) {
    r -= Math.max(0, item.weight ?? 1);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

export type BroadcastEvent =
  | { event: 'state'; payload: Record<string, unknown> }
  | { event: 'tts_play'; payload: { text?: string; audioUrl?: string | null } }
  | { event: 'sound_play'; payload: { name?: string } }
  | { event: 'wheel_spin'; payload: Record<string, unknown> }
  | { event: 'activity'; payload: Record<string, unknown> }
  | { event: 'chat'; payload: Record<string, unknown> };

export type LiveStateShape = {
  win: number;
  winLabel: string;
  winGoal: number | null;
  winMin: number | null;
  winMax: number | null;
  updatedAt: string;
};
