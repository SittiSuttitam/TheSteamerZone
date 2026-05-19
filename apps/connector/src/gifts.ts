import type { GiftConfigFile, GiftMapping } from './config.js';
import { weightedPick } from '@thesteamerzone/shared';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const keySender: { sendCombination: (keys: string[]) => void } =
  require('node-key-sender');

const GIFT_COMBO_TIMEOUT_MS = 5000;

const FALLBACK_WHEEL = [
  { label: '+5', weight: 1, action: 'win', value: 5, effect: 'good' },
  { label: '+3', weight: 1, action: 'win', value: 3, effect: 'good' },
  { label: '+1', weight: 1, action: 'win', value: 1, effect: 'good' },
  { label: '0', weight: 1, action: 'win', value: 0, effect: 'neutral' },
  { label: '-1', weight: 1, action: 'win', value: -1, effect: 'bad' },
];

export interface ComboData {
  coins: number;
  repeatCount: number;
  displayName: string;
  profilePicture: string;
  giftName: string;
  username: string;
  giftId: string;
  timeout?: ReturnType<typeof setTimeout>;
}

export type WinMutator = (delta: number) => void;

export function processGiftMapping(
  giftConfig: GiftConfigFile,
  giftId: string,
  giftName: string,
  _giftNameRaw: string,
  repeatCount: number,
  onWinDelta: WinMutator
): { applied: boolean; detail?: string } {
  const mapping = (giftConfig.mappings || []).find((m: GiftMapping) => {
    if (m.enabled === false) return false;
    const mid = m.giftId ? String(m.giftId) : '';
    const mname = (m.giftName || m.name || '').toLowerCase();
    return (
      (mid && giftId && mid === giftId) ||
      (Boolean(mname) && Boolean(giftName) && mname === giftName)
    );
  });
  if (!mapping) return { applied: false };

  const mult = Number(mapping.multiplier);
  const value = Number(mapping.value);
  const safeMult = Number.isNaN(mult) ? 1 : mult;
  const safeVal = Number.isNaN(value) ? 0 : value;

  if (mapping.action === 'win') {
    const delta = safeVal * safeMult * repeatCount;
    if (!Number.isNaN(delta)) {
      onWinDelta(delta);
      return { applied: true, detail: `win ${delta}` };
    }
  } else if (mapping.action === 'key') {
    const keyValue = mapping.value ?? mapping.keyCombo ?? '';
    const combo = String(keyValue)
      .split('+')
      .map((k) => k.trim())
      .filter(Boolean);
    if (combo.length) {
      try {
        keySender.sendCombination(combo);
      } catch (e) {
        console.warn('[key-sender]', e);
      }
      return { applied: true, detail: combo.join('+') };
    }
  }
  return { applied: false };
}

export function createGiftComboTracker(
  onFinalize: (data: ComboData) => void
) {
  const activeGiftCombos = new Map<string, ComboData>();

  function finalizeComboGift(comboKey: string, comboData: ComboData | undefined) {
    if (!comboData) return;
    if (comboData.timeout) clearTimeout(comboData.timeout);
    activeGiftCombos.delete(comboKey);
    onFinalize(comboData);
  }

  function handleGiftEventRaw(
    ev: Record<string, unknown>,
    processEnd: (
      coins: number,
      repeat: number,
      data: ComboData | undefined
    ) => void
  ) {
    const giftId =
      ev.giftId !== undefined
        ? String(ev.giftId)
        : ev.gift_id !== undefined
          ? String(ev.gift_id)
          : '';
    const giftNameRaw = String(ev.giftName || ev.gift_name || '');
    const giftName = giftNameRaw.toLowerCase();
    const coins = Number(ev.diamondCount || ev.diamond_count || 0);
    const repeatCount =
      Number(ev.repeatCount || ev.repeat_count || ev.count || 1) || 1;
    const username = String(ev.uniqueId || ev.userId || '');
    const repeatEnd = ev.repeatEnd as boolean | undefined;

    if (repeatEnd === false) {
      const ckey = `${username}_${giftId}`;
      const existing = activeGiftCombos.get(ckey);
      if (existing?.timeout) clearTimeout(existing.timeout);
      const timeout = setTimeout(() => {
        const d = activeGiftCombos.get(ckey);
        if (d) finalizeComboGift(ckey, d);
      }, GIFT_COMBO_TIMEOUT_MS);
      activeGiftCombos.set(ckey, {
        coins,
        repeatCount,
        displayName: String(ev.nickname || ev.displayName || username),
        profilePicture: String(ev.profilePictureUrl || ev.avatar || ''),
        giftName: giftNameRaw,
        username,
        giftId,
        timeout,
      });
      return;
    }

    const ckey = `${username}_${giftId}`;
    const comboData = activeGiftCombos.get(ckey);
    let finalCoins = coins;
    let finalRepeat = repeatCount;
    if (comboData) {
      if (comboData.timeout) clearTimeout(comboData.timeout);
      finalCoins = comboData.coins;
      finalRepeat = comboData.repeatCount;
      activeGiftCombos.delete(ckey);
    }

    processEnd(finalCoins, finalRepeat, comboData);
  }

  return { handleGiftEventRaw, clearCombos: () => activeGiftCombos.clear() };
}

export function triggerWheelIfMatch(
  giftConfig: GiftConfigFile,
  args: { giftId: string; giftName: string; count: number },
  broadcast: (event: string, payload: Record<string, unknown>) => void
) {
  const w = giftConfig.wheel;
  if (!w?.enabled) return;
  const triggerIds = w.triggerGiftIds || w.triggerIds || [];
  const triggers = triggerIds
    .flatMap((x: string) => String(x || '').split(','))
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  const gId = (args.giftId || '').toLowerCase();
  const gName = (args.giftName || '').toLowerCase();
  const matched = triggers.some((t) => t === gId || t === gName);
  if (!matched) return;

  const items =
    Array.isArray(w.items) && w.items.length ? w.items : FALLBACK_WHEEL;
  const selected = pickWheelItem(w);
  const selectedIndex = items.findIndex(
    (it) => it.label === selected.label && it.value === selected.value
  );
  const spinMs = w.spinMs || 5000;
  const resultMs = w.resultMs || 5000;
  const reqId = `wheel-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  broadcast('wheel_spin', {
    type: 'wheel-spin',
    items,
    selectedItem: selected,
    selectedIndex: selectedIndex >= 0 ? selectedIndex : 0,
    spinMs,
    resultMs,
    scale: w.scale || 1,
    playSpinSound: !!w.playSpinSound,
    playResultSound: !!w.playResultSound,
    requestId: reqId,
    giftId: args.giftId,
    giftName: args.giftName,
    count: args.count,
  });
}

export function pickWheelItem(wheel: GiftConfigFile['wheel']) {
  const items =
    Array.isArray(wheel.items) && wheel.items.length ? wheel.items : FALLBACK_WHEEL;
  return weightedPick(items);
}
