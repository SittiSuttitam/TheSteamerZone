import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  processGiftMapping,
  pickWheelItem,
} from '../../apps/connector/dist/gifts.js';

describe('gifts: processGiftMapping', () => {
  const cfg = {
    enabled: true,
    mappings: [
      {
        giftId: '5655',
        name: 'Rose',
        action: 'win',
        value: 2,
        multiplier: 1,
        enabled: true,
      },
    ],
    wheel: { enabled: false, items: [] },
  };

  it('applies win delta with repeat count', () => {
    let delta = 0;
    const r = processGiftMapping(cfg, '5655', 'rose', 'Rose', 3, (d) => {
      delta = d;
    });
    assert.equal(r.applied, true);
    assert.equal(delta, 6);
  });

  it('ignores disabled mapping', () => {
    const off = {
      ...cfg,
      mappings: [{ ...cfg.mappings[0], enabled: false }],
    };
    let applied = false;
    processGiftMapping(off, '5655', 'rose', 'Rose', 1, () => {
      applied = true;
    });
    assert.equal(applied, false);
  });
});

describe('gifts: pickWheelItem', () => {
  it('returns an item from wheel config', () => {
    const wheel = {
      enabled: true,
      items: [
        { label: 'A', weight: 1, action: 'win', value: 1 },
        { label: 'B', weight: 1, action: 'win', value: 2 },
      ],
    };
    const item = pickWheelItem(wheel);
    assert.ok(['A', 'B'].includes(item.label));
  });
});
