import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultGiftConfig,
  normalizeGiftConfig,
} from '../../packages/shared/dist/giftConfig.js';

describe('giftConfig: normalizeGiftConfig', () => {
  it('fills defaults when empty', () => {
    const cfg = normalizeGiftConfig(null);
    assert.equal(cfg.enabled, true);
    assert.ok(Array.isArray(cfg.mappings));
    assert.ok(cfg.wheel.items.length >= 1);
  });

  it('merges partial wheel config', () => {
    const cfg = normalizeGiftConfig({
      enabled: false,
      wheel: { enabled: true, items: [{ label: 'X', weight: 1, action: 'win', value: 1 }] },
    });
    assert.equal(cfg.enabled, false);
    assert.equal(cfg.wheel.enabled, true);
    assert.equal(cfg.wheel.items[0].label, 'X');
  });
});

describe('giftConfig: defaultGiftConfig', () => {
  it('has rose mapping', () => {
    const d = defaultGiftConfig();
    assert.ok(d.mappings.some((m) => m.giftId === '5655'));
  });
});
