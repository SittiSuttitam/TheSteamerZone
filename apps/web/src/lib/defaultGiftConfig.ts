import type { GiftConfig } from '../components/GiftRulesEditor';

export const DEFAULT_GIFT_CONFIG: GiftConfig = {
  enabled: true,
  mockEnabled: true,
  mappings: [
    {
      giftId: '5655',
      giftName: 'Rose',
      action: 'win',
      value: 1,
      multiplier: 1,
      enabled: true,
    },
  ],
  wheel: {
    enabled: false,
    triggerIds: ['5655'],
    items: [
      { label: '+5', weight: 1, action: 'win', value: 5, effect: 'good' },
      { label: '+3', weight: 1, action: 'win', value: 3, effect: 'good' },
      { label: '+1', weight: 1, action: 'win', value: 1, effect: 'good' },
      { label: '0', weight: 1, action: 'win', value: 0, effect: 'neutral' },
      { label: '-1', weight: 1, action: 'win', value: -1, effect: 'bad' },
    ],
    spinMs: 5000,
  },
};
