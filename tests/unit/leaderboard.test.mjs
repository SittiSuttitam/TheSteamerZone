import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { bumpLeaderboard } from '../../apps/connector/dist/leaderboard.js';

describe('leaderboard: bumpLeaderboard', () => {
  it('accumulates score per user', () => {
    let list = [];
    list = bumpLeaderboard(list, 'u1', 'Alice', 5);
    list = bumpLeaderboard(list, 'u1', 'Alice', 3);
    list = bumpLeaderboard(list, 'u2', 'Bob', 10);
    assert.equal(list[0].userId, 'u2');
    assert.equal(list[0].score, 10);
    assert.equal(list[1].score, 8);
  });

  it('keeps max 10 entries', () => {
    let list = [];
    for (let i = 0; i < 15; i++) {
      list = bumpLeaderboard(list, `u${i}`, `User${i}`, i);
    }
    assert.equal(list.length, 10);
  });
});
