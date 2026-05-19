import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  weightedPick,
  findVoicePreset,
  DEFAULT_TTS_VOICE_ID,
  TTS_VOICE_PRESETS,
} from '../../packages/shared/dist/index.js';

describe('shared: weightedPick', () => {
  it('returns only item when single choice', () => {
    const items = [{ label: 'a', weight: 1 }];
    assert.equal(weightedPick(items, () => 0).label, 'a');
  });

  it('respects weights with deterministic random', () => {
    const items = [
      { label: 'heavy', weight: 9 },
      { label: 'light', weight: 1 },
    ];
    assert.equal(weightedPick(items, () => 0.05).label, 'heavy');
    assert.equal(weightedPick(items, () => 0.95).label, 'light');
  });
});

describe('shared: tts voices', () => {
  it('has Thai neural presets', () => {
    assert.ok(TTS_VOICE_PRESETS.some((v) => v.googleName.includes('th-TH-Neural2')));
  });

  it('findVoicePreset resolves default', () => {
    const p = findVoicePreset(DEFAULT_TTS_VOICE_ID);
    assert.ok(p);
    assert.equal(p.languageCode, 'th-TH');
  });
});
