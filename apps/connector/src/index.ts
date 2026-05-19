import 'dotenv/config';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { createRealtimePublisher } from './realtime.js';
import {
  getDataDir,
  loadGiftConfig,
  saveGiftConfig,
  type GiftConfigFile,
} from './config.js';
import {
  createGiftComboTracker,
  processGiftMapping,
  triggerWheelIfMatch,
  pickWheelItem,
} from './gifts.js';
import { fetchActionsForRoom } from './actions.js';
import { createTtsService } from './tts.js';
import {
  DEFAULT_TTS_SETTINGS,
  type TtsSettingsShape,
} from '@thesteamerzone/shared';

const PORT = Number(process.env.CONNECTOR_PORT || 8780);
const PUBLIC_URL =
  process.env.CONNECTOR_PUBLIC_URL || `http://127.0.0.1:${PORT}`;
const ROOM_ID = process.env.DEFAULT_ROOM_ID || '';
const USER_DATA = getDataDir(process.env.USER_DATA_DIR);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface LocalState {
  win: number;
  winLabel: string;
  winGoal: number | null;
  winMin: number | null;
  winMax: number | null;
}

let state: LocalState = {
  win: 0,
  winLabel: 'WIN',
  winGoal: null,
  winMin: null,
  winMax: null,
};

let giftConfig: GiftConfigFile = loadGiftConfig(USER_DATA);
let giftConnection: WebcastPushConnection | null = null;
let connectedRoom = '';

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const rt = supabaseAdmin
  ? createRealtimePublisher(supabaseAdmin, async (roomId) => {
      const { data } = await supabaseAdmin
        .from('rooms')
        .select('widget_secret')
        .eq('id', roomId)
        .maybeSingle();
      return data?.widget_secret ?? null;
    })
  : null;

const giftTracker = createGiftComboTracker((comboData) => {
  void comboData;
});

let ttsSettings: TtsSettingsShape = { ...DEFAULT_TTS_SETTINGS };

function resolveGoogleApiKey(): string {
  const fromEnv = (process.env.GOOGLE_TTS_API_KEY || '').trim();
  if (fromEnv) return fromEnv;
  return (ttsSettings.google_api_key || '').trim();
}

const tts = createTtsService(USER_DATA, resolveGoogleApiKey);
ttsSettings = tts.loadSettingsFile(USER_DATA);

function maskGoogleKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/** ส่งให้แดชบอร์ด — ไม่รวมคีย์เต็ม */
function publicTtsSettings() {
  const key = resolveGoogleApiKey();
  const fromEnv = !!(process.env.GOOGLE_TTS_API_KEY || '').trim();
  const fromSaved = !!(ttsSettings.google_api_key || '').trim();
  const { google_api_key: _omit, ...safe } = ttsSettings;
  return {
    ...safe,
    googleConfigured: !!key,
    googleKeyHint: key ? maskGoogleKey(key) : null,
    googleKeySource: fromEnv ? 'env' : fromSaved ? 'saved' : 'none',
    publicUrl: PUBLIC_URL,
  };
}

function templateFill(
  tpl: string,
  vars: Record<string, string>
): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

async function speakAndBroadcast(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const room = effectiveRoomId();
  let audioUrl: string | null = null;
  let engine = 'web_speech';

  const order = ttsSettings.engine_order?.length
    ? ttsSettings.engine_order
    : DEFAULT_TTS_SETTINGS.engine_order;

  for (const eng of order) {
    if (eng === 'google_cloud' && resolveGoogleApiKey()) {
      const out = await tts.synthesizeGoogle(trimmed, ttsSettings);
      if (out) {
        audioUrl = `${PUBLIC_URL}${out.audioUrl}`;
        engine = 'google_cloud';
        break;
      }
    }
  }

  const payload = {
    type: 'tts_play',
    text: trimmed,
    audioUrl,
    engine,
    voiceId: ttsSettings.voice_id,
    rate: ttsSettings.rate,
    pitch: ttsSettings.pitch,
    volume: ttsSettings.volume,
  };

  if (rt) {
    await rt.broadcast(room, 'tts_play', payload);
  }
}

async function pushState() {
  const room = effectiveRoomId();
  const payload = {
    type: 'state' as const,
    state: {
      win: state.win,
      winLabel: state.winLabel,
      winGoal: state.winGoal,
      winMin: state.winMin,
      winMax: state.winMax,
    },
  };
  if (rt) {
    await rt.broadcast(room, 'state', payload as unknown as Record<string, unknown>);
    await rt.upsertLiveState(room, {
      win: state.win,
      win_label: state.winLabel,
      win_goal: state.winGoal,
      win_min: state.winMin,
      win_max: state.winMax,
    });
  }
}

function effectiveRoomId(): string {
  return ROOM_ID || '00000000-0000-0000-0000-000000000001';
}

function clampWin(n: number) {
  let v = n;
  if (state.winMin != null) v = Math.max(state.winMin, v);
  if (state.winMax != null) v = Math.min(state.winMax, v);
  return v;
}

function applyWinDelta(delta: number) {
  const prev = state.win;
  state.win = clampWin(state.win + delta);
  void pushState();
  if (delta > 0 && state.win > prev) {
    void rt?.broadcast(effectiveRoomId(), 'sound_play', {
      type: 'sound_play',
      name: 'increment',
    });
  } else if (delta < 0 && state.win < prev) {
    void rt?.broadcast(effectiveRoomId(), 'sound_play', {
      type: 'sound_play',
      name: 'decrement',
    });
  }
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/actions', async (req, res) => {
  if (!supabaseAdmin) {
    res.json([]);
    return;
  }
  const room = String(req.query.roomId || ROOM_ID || effectiveRoomId());
  try {
    const rows = await fetchActionsForRoom(supabaseAdmin, room);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'TheSteamerZone-connector',
    tiktok: !!giftConnection,
    room: connectedRoom,
    supabase: !!rt,
    ttsGoogle: !!resolveGoogleApiKey(),
    dataDir: USER_DATA,
  });
});

app.get('/api/state', (_req, res) => {
  res.json({ ...state, roomId: effectiveRoomId(), giftEnabled: giftConfig.enabled });
});

app.patch('/api/state', (req, res) => {
  const b = req.body || {};
  if (typeof b.win === 'number') state.win = clampWin(b.win);
  if (typeof b.winLabel === 'string') state.winLabel = b.winLabel;
  if (b.winGoal === null || typeof b.winGoal === 'number')
    state.winGoal = b.winGoal;
  if (b.winMin === null || typeof b.winMin === 'number')
    state.winMin = b.winMin;
  if (b.winMax === null || typeof b.winMax === 'number')
    state.winMax = b.winMax;
  void pushState();
  res.json(state);
});

app.post('/api/win/delta', (req, res) => {
  const d = Number(req.body?.delta ?? 0);
  applyWinDelta(d);
  res.json(state);
});

app.post('/api/win/increment', (_req, res) => {
  applyWinDelta(1);
  res.json(state);
});
app.post('/api/win/decrement', (_req, res) => {
  applyWinDelta(-1);
  res.json(state);
});
app.post('/api/win/reset', (_req, res) => {
  state.win = clampWin(0);
  void pushState();
  res.json(state);
});

app.get('/api/config/gift', (_req, res) => {
  giftConfig = loadGiftConfig(USER_DATA);
  res.json(giftConfig);
});

app.put('/api/config/gift', (req, res) => {
  giftConfig = { ...giftConfig, ...req.body };
  saveGiftConfig(USER_DATA, giftConfig);
  res.json(giftConfig);
});

function handleGiftPayload(ev: Record<string, unknown>) {
  if (!giftConfig.enabled) return;
  giftTracker.handleGiftEventRaw(ev, (_coins, finalRepeat) => {
    const giftId =
      ev.giftId !== undefined
        ? String(ev.giftId)
        : ev.gift_id !== undefined
          ? String(ev.gift_id)
          : '';
    const giftNameRaw = String(ev.giftName || ev.gift_name || '');
    const giftName = giftNameRaw.toLowerCase();
    triggerWheelIfMatch(
      giftConfig,
      { giftId, giftName: giftNameRaw, count: finalRepeat },
      (event, payload) =>
        void rt?.broadcast(effectiveRoomId(), event, payload)
    );
    processGiftMapping(
      giftConfig,
      giftId,
      giftName,
      giftNameRaw,
      finalRepeat,
      applyWinDelta
    );
    void rt?.broadcast(effectiveRoomId(), 'activity', {
      type: 'gift',
      giftId,
      giftName: giftNameRaw,
      repeatCount: finalRepeat,
    });

    if (ttsSettings.read_gifts) {
      const nickname = String(
        ev.nickname ?? ev.displayName ?? ev.uniqueId ?? 'ผู้ชม'
      );
      void speakAndBroadcast(
        templateFill(ttsSettings.gift_template, {
          nickname,
          gift: giftNameRaw,
          giftName: giftNameRaw,
          count: String(finalRepeat),
        })
      );
    }
  });
}

app.post('/api/mock/gift', (req, res) => {
  const ev = { ...req.body, mock: true };
  handleGiftPayload(ev);
  res.json({ ok: true });
});

app.post('/api/tiktok/connect', async (req, res) => {
  const roomId = String(req.body?.username || req.body?.roomId || '').replace(
    /^@/,
    ''
  );
  if (!roomId) {
    res.status(400).json({ error: 'username required' });
    return;
  }
  try {
    if (giftConnection) {
      await giftConnection.disconnect();
      giftConnection = null;
    }
    giftConnection = new WebcastPushConnection(roomId, {
      enableExtendedGiftInfo: true,
      enableWebsocketUpgrade: true,
      requestPollingIntervalMs: 1000,
    });
    giftConnection.on('gift', (data: Record<string, unknown>) =>
      handleGiftPayload(data)
    );
    giftConnection.on('chat', (data: Record<string, unknown>) => {
      const comment = String(
        data.comment ?? data.text ?? data.content ?? ''
      );
      const nickname = String(
        data.nickname ?? data.displayName ?? data.uniqueId ?? ''
      );
      void rt?.broadcast(effectiveRoomId(), 'chat', {
        type: 'chat',
        comment,
        user: String(data.uniqueId ?? data.userId ?? ''),
        nickname,
      });
      if (ttsSettings.read_chat && comment.trim()) {
        void speakAndBroadcast(
          templateFill(ttsSettings.chat_template, { nickname, comment })
        );
      }
    });
    giftConnection.on('error', (err: Error) =>
      console.warn('[TikTok]', err.message)
    );
    await giftConnection.connect();
    connectedRoom = roomId;
    res.json({ ok: true, username: roomId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.get('/api/tts/settings', (_req, res) => {
  res.json(publicTtsSettings());
});

app.put('/api/tts/settings', (req, res) => {
  const body = (req.body || {}) as Record<string, unknown>;

  if (body.clear_google_api_key === true) {
    delete ttsSettings.google_api_key;
  } else if (typeof body.google_api_key === 'string') {
    const k = body.google_api_key.trim();
    if (k) ttsSettings.google_api_key = k;
    else delete ttsSettings.google_api_key;
  }

  const {
    google_api_key: _gk,
    clear_google_api_key: _clr,
    googleConfigured: _gc,
    googleKeyHint: _gh,
    googleKeySource: _gs,
    publicUrl: _pu,
    ...rest
  } = body;

  ttsSettings = { ...ttsSettings, ...(rest as Partial<TtsSettingsShape>) };
  tts.saveSettingsFile(USER_DATA, ttsSettings);
  res.json(publicTtsSettings());
});

app.get('/api/tts/audio/:id', (req, res) => {
  const entry = tts.getAudioEntry(req.params.id);
  if (!entry || !fs.existsSync(entry.filePath)) {
    res.status(404).end();
    return;
  }
  res.setHeader('Content-Type', entry.mime);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  fs.createReadStream(entry.filePath).pipe(res);
});

app.post('/api/tts/synthesize', async (req, res) => {
  const text = String(req.body?.text ?? '').trim();
  if (!text) {
    res.status(400).json({ error: 'text required' });
    return;
  }
  const settings = { ...ttsSettings, ...req.body?.settings };
  if (req.body?.voiceId) settings.voice_id = String(req.body.voiceId);

  if (resolveGoogleApiKey()) {
    const out = await tts.synthesizeGoogle(text, settings);
    if (out) {
      res.json({
        ok: true,
        engine: 'google_cloud',
        audioUrl: `${PUBLIC_URL}${out.audioUrl}`,
        text,
      });
      return;
    }
  }
  res.json({
    ok: true,
    engine: 'web_speech',
    audioUrl: null,
    text,
    message: resolveGoogleApiKey()
      ? 'Google synthesis failed — use Web Speech in browser'
      : 'Add Google API key in Voice settings or connector .env',
  });
});

app.post('/api/tts/speak', async (req, res) => {
  const text = String(req.body?.text ?? '').trim();
  if (!text) {
    res.status(400).json({ error: 'text required' });
    return;
  }
  await speakAndBroadcast(text);
  res.json({ ok: true });
});

app.post('/api/wheel/result', (req, res) => {
  const item = (req.body?.item || req.body?.selectedItem) as Record<
    string,
    unknown
  > | null;
  if (!item) {
    res.status(400).json({ error: 'item required' });
    return;
  }
  const label = String(item.label ?? '');
  let action = String(item.action ?? 'none').trim() || 'none';
  const rawValue = Number(item.value);
  const count = Number(req.body?.count || 1) || 1;
  const value = (!Number.isNaN(rawValue) ? rawValue : 0) * count;

  if ((action === 'win' || action === 'win_delta') && value !== 0) {
    applyWinDelta(value);
  }

  void rt?.broadcast(effectiveRoomId(), 'activity', {
    type: 'wheel',
    giftName: `วงล้อ: ${label}`,
    item: label,
    action,
    value,
    count,
  });

  res.json({ ok: true, win: state.win, label, action, value });
});

app.post('/api/wheel/mock-spin', async (req, res) => {
  const w = giftConfig.wheel;
  const items =
    Array.isArray(w?.items) && w.items.length
      ? w.items
      : [
          { label: '+5', weight: 1, action: 'win', value: 5, effect: 'good' },
          { label: '-1', weight: 1, action: 'win', value: -1, effect: 'bad' },
        ];
  const selected = pickWheelItem({ ...w, items });
  const selectedIndex = items.findIndex(
    (it) => it.label === selected.label && it.value === selected.value
  );
  const payload = {
    type: 'wheel-spin',
    items,
    selectedItem: selected,
    selectedIndex: selectedIndex >= 0 ? selectedIndex : 0,
    spinMs: w?.spinMs ?? 5000,
    resultMs: w?.resultMs ?? 5000,
    scale: w?.scale ?? 1,
    playSpinSound: !!w?.playSpinSound,
    playResultSound: !!w?.playResultSound,
    requestId: `mock-${Date.now()}`,
    count: Number(req.body?.count) || 1,
  };
  if (rt) await rt.broadcast(effectiveRoomId(), 'wheel_spin', payload);
  res.json({ ok: true, payload });
});

app.post('/api/tiktok/disconnect', async (_req, res) => {
  try {
    if (giftConnection) {
      await giftConnection.disconnect();
      giftConnection = null;
    }
    connectedRoom = '';
    giftTracker.clearCombos();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`[TheSteamerZone] connector http://127.0.0.1:${PORT}`);
  console.log(`[TheSteamerZone] data: ${USER_DATA}`);
  if (!ROOM_ID) console.warn('[TheSteamerZone] Set DEFAULT_ROOM_ID to your Supabase rooms.id UUID');
  if (!rt) console.warn('[TheSteamerZone] Supabase env missing — Realtime + DB sync disabled');
});
