import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const PORT = 18780;
const BASE = `http://127.0.0.1:${PORT}`;

let proc;

async function waitHealth(maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return await res.json();
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('connector health timeout');
}

before(async () => {
  proc = spawn('node', ['dist/index.js'], {
    cwd: path.join(root, 'apps/connector'),
    env: { ...process.env, CONNECTOR_PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitHealth();
});

after(() => {
  if (proc && !proc.killed) proc.kill();
});

describe('connector API smoke', () => {
  it('GET /health', async () => {
    const j = await waitHealth(3000);
    assert.equal(j.ok, true);
    assert.equal(j.service, 'TheSteamerZone-connector');
  });

  it('WIN increment / decrement / reset', async () => {
    await fetch(`${BASE}/api/win/reset`, { method: 'POST' });
    let res = await fetch(`${BASE}/api/state`);
    let s = await res.json();
    assert.equal(s.win, 0);

    await fetch(`${BASE}/api/win/increment`, { method: 'POST' });
    res = await fetch(`${BASE}/api/state`);
    s = await res.json();
    assert.equal(s.win, 1);

    await fetch(`${BASE}/api/win/decrement`, { method: 'POST' });
    res = await fetch(`${BASE}/api/state`);
    s = await res.json();
    assert.equal(s.win, 0);
  });

  it('GET/PUT /api/tts/settings', async () => {
    const res = await fetch(`${BASE}/api/tts/settings`);
    assert.equal(res.status, 200);
    const s = await res.json();
    assert.ok(Array.isArray(s.engine_order) || s.voice_id);
    assert.equal(s.google_api_key, undefined);

    const put = await fetch(`${BASE}/api/tts/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate: 1.1 }),
    });
    assert.equal(put.status, 200);
    const s2 = await put.json();
    assert.equal(s2.rate, 1.1);

    const putKey = await fetch(`${BASE}/api/tts/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ google_api_key: 'AIzaSyTestKey1234567890' }),
    });
    const s3 = await putKey.json();
    assert.equal(s3.googleConfigured, true);
    assert.equal(s3.googleKeySource, 'saved');
    assert.ok(s3.googleKeyHint);

    await fetch(`${BASE}/api/tts/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear_google_api_key: true }),
    });
  });

  it('POST /api/tts/synthesize returns web_speech without API key', async () => {
    const res = await fetch(`${BASE}/api/tts/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'ทดสอบ' }),
    });
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.ok(j.ok);
    assert.ok(['web_speech', 'google_cloud'].includes(j.engine));
  });

  it('POST /api/wheel/mock-spin', async () => {
    const res = await fetch(`${BASE}/api/wheel/mock-spin`, { method: 'POST' });
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.ok, true);
    assert.ok(j.payload?.selectedItem);
  });

  it('POST /api/wheel/result applies win', async () => {
    await fetch(`${BASE}/api/win/reset`, { method: 'POST' });
    const res = await fetch(`${BASE}/api/wheel/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item: { label: '+5', action: 'win', value: 5 },
        count: 1,
      }),
    });
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.win, 5);
  });

  it('POST /api/mock/gift', async () => {
    const res = await fetch(`${BASE}/api/mock/gift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        giftId: '5655',
        giftName: 'Rose',
        repeatCount: 1,
        repeatEnd: true,
      }),
    });
    assert.equal(res.status, 200);
  });
});
