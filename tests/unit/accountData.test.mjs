import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAccountDataDir,
  userIdFromAccessToken,
} from '../../apps/connector/dist/accountData.js';
import path from 'node:path';

describe('accountData: resolveAccountDataDir', () => {
  it('uses base when no user id', () => {
    assert.equal(resolveAccountDataDir('/data', undefined), '/data');
  });

  it('nests under accounts/{userId}', () => {
    const p = resolveAccountDataDir('/data', 'abc-123');
    assert.equal(p, path.join('/data', 'accounts', 'abc-123'));
  });
});

describe('accountData: userIdFromAccessToken', () => {
  it('returns null for invalid token', () => {
    assert.equal(userIdFromAccessToken(''), null);
    assert.equal(userIdFromAccessToken('not-a-jwt'), null);
  });

  it('reads sub from payload', () => {
    const payload = Buffer.from(JSON.stringify({ sub: 'user-xyz' })).toString(
      'base64url'
    );
    const token = `h.${payload}.s`;
    assert.equal(userIdFromAccessToken(token), 'user-xyz');
  });
});
