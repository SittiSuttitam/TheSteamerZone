import './loadEnv.js';
import fs from 'node:fs';
import path from 'node:path';
import { getInstallDir } from './loadEnv.js';
import express from 'express';
import cors from 'cors';
import type { SupabaseClient } from '@supabase/supabase-js';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { createRealtimePublisher } from './realtime.js';
import {
  createConnectorSupabase,
  getLastAuthError,
  hasServerBuildConfig,
  usesServiceRole,
} from './supabaseClient.js';
import { getDataDir, type GiftConfigFile } from './config.js';
import { resolveAccountDataDir, userIdFromAccessToken } from './accountData.js';
import {
  loadGiftConfigForRoom,
  saveGiftConfigForRoom,
} from './giftConfigStore.js';
import { bumpLeaderboard, parseTopDonors, parseTopLikers } from './leaderboard.js';
import { defaultGiftConfig, type LeaderboardEntry } from '@thesteamerzone/shared';
import {
  createGiftComboTracker,
  processGiftMapping,
  triggerWheelIfMatch,
  pickWheelItem,
} from './gifts.js';
import { fetchActionsForRoom } from './actions.js';
import { createTtsService } from './tts.js';
import {
  IMAGE_SLOTS,
  clearImageSlot,
  imagesDir,
  loadImageOverlayConfig,
  publicImageConfig,
  uploadImage,
  type ImageSlot,
} from './imageOverlay.js';
import {
  DEFAULT_TTS_SETTINGS,
  normalizeEngineOrder,
  type TtsEngineId,
  type TtsSettingsShape,
} from '@thesteamerzone/shared';
import {
  formatRoomCode,
  loadUserConfig,
  saveUserConfig,
  type UserConfigFile,
} from './userConfig.js';
import { resolveRoomForPairing, touchConnectorLinked } from './roomPairing.js';
import { isDesktopAppOpen } from './desktopApp.js';
import {
  defaultViewerConfig,
  listSoundFiles,
  loadViewerConfig,
  saveViewerConfig,
  soundsDir,
  type ViewerConfigFile,
} from './viewerConfig.js';
import {
  defaultSoundConfig,
  loadSoundConfig,
  saveSoundConfig,
  type SoundConfigFile,
} from './soundConfig.js';
import { resolveWebPublicUrl, normalizeDashboardUrl } from './siteUrl.js';

const PORT = Number(process.env.CONNECTOR_PORT || 8780);
const WEB_PUBLIC_URL = resolveWebPublicUrl();
const PUBLIC_URL =
  process.env.CONNECTOR_PUBLIC_URL || `http://127.0.0.1:${PORT}`;
const ROOM_ID = process.env.DEFAULT_ROOM_ID || '';
const BASE_DATA = getDataDir(process.env.USER_DATA_DIR);
const SUPABASE_URL = process.env.SUPABASE_URL || '';

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

let topDonors: LeaderboardEntry[] = [];
let topLikers: LeaderboardEntry[] = [];
let totalLikes = 0;
let likeGoal: number | null = null;

let userConfig: UserConfigFile = loadUserConfig(BASE_DATA);

function activeDataDir(): string {
  return resolveAccountDataDir(BASE_DATA, userConfig.linkedUserId);
}

let giftConfig: GiftConfigFile = defaultGiftConfig() as GiftConfigFile;

async function reloadGiftConfigForRoom(): Promise<void> {
  const room = effectiveRoomId();
  giftConfig = await loadGiftConfigForRoom(supabaseDb, activeDataDir(), room);
}

async function assertRoomBelongsToLinkedUser(roomId: string): Promise<string | null> {
  if (!supabaseDb) return null;
  const { data: auth } = await supabaseDb.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return 'ล็อกอินเว็บแล้วกดเชื่อมต่อทั้งหมด';
  const { data: room, error } = await supabaseDb
    .from('rooms')
    .select('owner_id')
    .eq('id', roomId)
    .maybeSingle();
  if (error) return error.message;
  if (!room) return 'ไม่พบห้องนี้';
  if (room.owner_id !== uid) return 'ห้องนี้ไม่ใช่ของบัญชีที่เชื่อมอยู่';
  return null;
}

async function loadLiveExtrasFromCloud(): Promise<void> {
  if (!supabaseDb) return;
  const room = effectiveRoomId();
  const { data } = await supabaseDb
    .from('live_state')
    .select('top_donors, top_likers, total_likes, like_goal, win, win_label, win_goal, win_min, win_max')
    .eq('room_id', room)
    .maybeSingle();
  if (!data) return;
  topDonors = parseTopDonors(data.top_donors);
  topLikers = parseTopLikers(data.top_likers);
  totalLikes = Number(data.total_likes ?? 0);
  likeGoal =
    data.like_goal === null || data.like_goal === undefined
      ? null
      : Number(data.like_goal);
  state.win = Number(data.win ?? state.win);
  state.winLabel = String(data.win_label ?? state.winLabel);
  state.winGoal =
    data.win_goal === null || data.win_goal === undefined
      ? null
      : Number(data.win_goal);
  state.winMin =
    data.win_min === null || data.win_min === undefined ? null : Number(data.win_min);
  state.winMax =
    data.win_max === null || data.win_max === undefined ? null : Number(data.win_max);
}
let giftConnection: WebcastPushConnection | null = null;
let connectedRoom = '';

let supabaseDb: SupabaseClient | null = null;
let rt: ReturnType<typeof createRealtimePublisher> | null = null;

function applySupabaseClient(client: SupabaseClient | null) {
  supabaseDb = client;
  if (!client) {
    rt = null;
    return;
  }
  rt = createRealtimePublisher(client, async (roomId) => {
    const { data } = await client
      .from('rooms')
      .select('widget_secret')
      .eq('id', roomId)
      .maybeSingle();
    return data?.widget_secret ?? null;
  });
}

async function refreshSupabase(): Promise<boolean> {
  const client = await createConnectorSupabase(userConfig, (tokens) => {
    userConfig = saveUserConfig(BASE_DATA, tokens);
  });
  if (!client) {
    applySupabaseClient(null);
    const hint = getLastAuthError();
    console.warn(
      '[TheSteamerZone] ซิงก์คลาวด์ปิด',
      hint || '— ล็อกอินเว็บแล้วกด「เชื่อมต่อทั้งหมด」'
    );
    return false;
  }
  if (usesServiceRole()) {
    applySupabaseClient(client);
    console.log('[TheSteamerZone] Supabase พร้อมซิงก์ (service role)');
    return true;
  }
  const { data } = await client.auth.getSession();
  if (!data.session?.access_token) {
    applySupabaseClient(null);
    console.warn('[TheSteamerZone] Supabase session ไม่พร้อม');
    return false;
  }
  if (data.session.access_token !== userConfig.accessToken) {
    const uid = userIdFromAccessToken(data.session.access_token);
    userConfig = saveUserConfig(BASE_DATA, {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token ?? userConfig.refreshToken,
      linkedUserId: uid ?? userConfig.linkedUserId,
    });
  }
  applySupabaseClient(client);
  console.log('[TheSteamerZone] Supabase พร้อมซิงก์');
  return true;
}

/** ให้มี Supabase client ก่อน pair / ซิงก์ (โปรแกรม portable ใช้ service role) */
async function ensureSupabaseDb(): Promise<SupabaseClient | null> {
  if (supabaseDb) return supabaseDb;
  const ok = await refreshSupabase();
  return ok ? supabaseDb : null;
}

const giftTracker = createGiftComboTracker((comboData) => {
  void comboData;
});

let ttsSettings: TtsSettingsShape = { ...DEFAULT_TTS_SETTINGS };

function resolveGoogleApiKey(): string {
  const fromEnv = (process.env.GOOGLE_TTS_API_KEY || '').trim();
  if (fromEnv) return fromEnv;
  return (ttsSettings.google_api_key || '').trim();
}

const tts = createTtsService(activeDataDir(), resolveGoogleApiKey);
ttsSettings = tts.loadSettingsFile(activeDataDir());

let imageOverlayConfig = loadImageOverlayConfig(activeDataDir());
{
  const dash = normalizeDashboardUrl(userConfig.dashboardUrl, WEB_PUBLIC_URL);
  if (dash && dash !== userConfig.dashboardUrl) {
    userConfig = saveUserConfig(BASE_DATA, { dashboardUrl: dash });
  }
  const uid =
    userConfig.linkedUserId ?? userIdFromAccessToken(userConfig.accessToken);
  if (uid && uid !== userConfig.linkedUserId) {
    userConfig = saveUserConfig(BASE_DATA, { linkedUserId: uid });
  }
}
let viewerConfig: ViewerConfigFile = loadViewerConfig(activeDataDir());
let soundConfig: SoundConfigFile = loadSoundConfig(activeDataDir());
const activeVips = new Map<string, { lastActivity: number; soundPlayed: boolean }>();
void refreshSupabase().then(() => reloadGiftConfigForRoom());
void loadLiveExtrasFromCloud();
setInterval(() => {
  if (userConfig.accessToken?.trim() || userConfig.refreshToken?.trim()) {
    void refreshSupabase();
  }
}, 45 * 60 * 1000);

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
  const payload = {
    type: 'tts_play',
    text: trimmed,
    audioUrl: null,
    engine: 'web_speech' as const,
    voiceId: ttsSettings.voice_id,
    systemVoiceUri: ttsSettings.system_voice_uri ?? null,
    rate: ttsSettings.rate,
    pitch: ttsSettings.pitch,
    volume: ttsSettings.volume,
  };

  if (rt) {
    await rt.broadcast(room, 'tts_play', payload);
  }
}

async function pushState() {
  if (!rt) {
    await refreshSupabase();
  }
  const room = effectiveRoomId();
  const fullState = {
    win: state.win,
    winLabel: state.winLabel,
    winGoal: state.winGoal,
    winMin: state.winMin,
    winMax: state.winMax,
    topDonors,
    topLikers,
    totalLikes,
    likeGoal,
  };
  const payload = {
    type: 'state' as const,
    state: fullState,
  };
  if (!rt) return;
  await rt.broadcast(room, 'state', payload as unknown as Record<string, unknown>);
  await rt.upsertLiveState(room, {
    win: state.win,
    win_label: state.winLabel,
    win_goal: state.winGoal,
    win_min: state.winMin,
    win_max: state.winMax,
    top_donors: topDonors,
    top_likers: topLikers,
    total_likes: totalLikes,
    like_goal: likeGoal,
  });
}

function effectiveRoomId(): string {
  const fromUser = userConfig.roomId?.trim();
  if (fromUser) return fromUser;
  if (ROOM_ID) return ROOM_ID;
  return '00000000-0000-0000-0000-000000000001';
}

function buildSetupStatus() {
  const desktopOpen = isDesktopAppOpen(BASE_DATA);
  const roomId = effectiveRoomId();
  const hasUserRoom = !!(userConfig.roomId?.trim() || ROOM_ID);
  const roomOk =
    hasUserRoom && roomId !== '00000000-0000-0000-0000-000000000001';
  const roomConfigured = roomOk && !!userConfig.setupCompleted;
  const webLinked = roomConfigured && desktopOpen;
  const cloudOk = !!rt;
  const serverConfigured = hasServerBuildConfig();
  const adminOk = serverConfigured;
  const hasUserToken = !!(userConfig.accessToken?.trim());
  const tiktokOk = !!giftConnection;
  const steps = [
    {
      id: 'program',
      label: 'โปรแกรม Connector ทำงาน',
      ok: true,
      hint: '',
    },
    {
      id: 'weblink',
      label: 'เว็บ ↔ โปรแกรม เชื่อมแล้ว',
      ok: webLinked,
      hint: webLinked
        ? userConfig.linkedAt
          ? `ล่าสุด ${new Date(userConfig.linkedAt).toLocaleString('th-TH')}`
          : ''
        : !desktopOpen && roomConfigured
          ? 'เปิดโปรแกรม Connector บนเครื่อง'
          : 'กรอกรหัสห้อง + รหัสเชื่อมในโปรแกรม',
    },
    {
      id: 'cloud',
      label: 'ซิงก์กับ OBS / Widgets',
      ok: cloudOk && roomOk,
      hint: cloudOk
        ? ''
        : !adminOk
          ? 'build โปรแกรมใหม่พร้อม SUPABASE_URL + ANON key'
          : usesServiceRole()
            ? 'ซิงก์คลาวด์ยังไม่ทำงาน — ตรวจ service_role'
            : !hasUserToken
              ? 'ล็อกอินเว็บแล้วกด「เชื่อมต่อทั้งหมด」'
              : getLastAuthError() ||
                'ซิงก์ไม่สำเร็จ — ล็อกอินใหม่แล้วกด「เชื่อมต่อทั้งหมด」อีกครั้ง',
    },
    {
      id: 'tiktok',
      label: 'TikTok Live (ตอนไลฟ์)',
      ok: tiktokOk,
      hint: tiktokOk
        ? `@${connectedRoom}`
        : 'ตั้งบนเว็บ — ใส่ชื่อผู้ใช้ตอนเริ่มไลฟ์',
    },
  ];
  const ready = webLinked && cloudOk && roomOk && tiktokOk;
  return {
    ready,
    steps,
    desktopAppOpen: desktopOpen,
    webLinked,
    roomConfigured,
    tiktokConnected: tiktokOk,
    roomId: roomOk ? roomId : null,
    roomCode: roomOk ? formatRoomCode(roomId) : null,
    dashboardUrl:
      normalizeDashboardUrl(userConfig.dashboardUrl, WEB_PUBLIC_URL) ||
      WEB_PUBLIC_URL,
    linkedAt: userConfig.linkedAt || null,
    cloudSync: cloudOk,
    cloudSyncError: cloudOk ? null : getLastAuthError(),
    needsAdminSetup: !serverConfigured,
    cloudAuth: usesServiceRole() ? 'service_role' : hasUserToken ? 'user' : 'none',
  };
}

function clampWin(n: number) {
  let v = n;
  if (state.winMin != null) v = Math.max(state.winMin, v);
  if (state.winMax != null) v = Math.min(state.winMax, v);
  return v;
}

async function broadcastSound(payload: {
  name?: string;
  file?: string;
  volume?: number;
}) {
  if (!rt) {
    await refreshSupabase();
  }
  if (!rt) return;
  const vol = viewerConfig.volume ?? 0.7;
  try {
    await rt.broadcast(effectiveRoomId(), 'sound_play', {
      type: 'sound_play',
      name: payload.name || 'custom',
      file: payload.file,
      volume: payload.volume ?? vol,
    });
  } catch (e) {
    console.warn('[sound]', e instanceof Error ? e.message : e);
  }
}

function applyWinDelta(delta: number) {
  const prev = state.win;
  state.win = clampWin(state.win + delta);
  void pushState();
  if (delta > 0 && state.win > prev) {
    void broadcastSound({ name: 'increment', file: soundConfig.incrementFile });
  } else if (delta < 0 && state.win < prev) {
    void broadcastSound({ name: 'decrement', file: soundConfig.decrementFile });
  }
}

function checkAndNotifyVip(data: Record<string, unknown>, eventType: string) {
  if (!viewerConfig.enabled || !rt) return;
  const username = String(data.uniqueId ?? data.userId ?? '')
    .replace(/^@/, '')
    .toLowerCase();
  if (!username) return;
  const tracked = viewerConfig.trackedUsers.find(
    (u) => u.username.toLowerCase() === username
  );
  if (!tracked?.soundFile) return;

  let info = activeVips.get(username);
  const now = Date.now();
  const displayName = String(
    data.nickname ?? data.displayName ?? tracked.displayName ?? username
  );

  if (!info) {
    info = { lastActivity: now, soundPlayed: true };
    activeVips.set(username, info);
    void rt.broadcast(effectiveRoomId(), 'vip_alert', {
      type: 'vip_alert',
      username,
      displayName,
      soundFile: tracked.soundFile,
      volume: viewerConfig.volume,
      eventType,
    });
    void broadcastSound({ name: 'vip', file: tracked.soundFile });
  } else {
    info.lastActivity = now;
  }
}

const app = express();

/** ให้เว็บ HTTPS (Vercel) เรียก Connector บนเครื่องได้ — Chrome Private Network Access */
app.use((req, res, next) => {
  if (req.headers['access-control-request-private-network'] === 'true') {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || 'Content-Type, Authorization'
    );
    res.status(204).end();
    return;
  }
  next();
});

app.use(cors({ origin: true }));
app.use(express.json({ limit: '4mb' }));
app.use('/images', express.static(imagesDir(activeDataDir())));
app.use('/sounds', express.static(soundsDir(activeDataDir())));

app.get('/api/actions', async (req, res) => {
  if (!supabaseDb) {
    res.json([]);
    return;
  }
  const room = String(req.query.roomId || ROOM_ID || effectiveRoomId());
  try {
    const rows = await fetchActionsForRoom(supabaseDb, room);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/shutdown', (_req, res) => {
  res.json({ ok: true });
  setTimeout(() => process.exit(0), 150);
});

app.get('/health', (_req, res) => {
  const setup = buildSetupStatus();
  const desktopOpen = setup.desktopAppOpen;
  res.json({
    ok: true,
    desktopAppOpen: desktopOpen,
    service: 'TheSteamerZone-connector',
    tiktok: !!giftConnection,
    tiktokRoom: connectedRoom,
    defaultRoomId: effectiveRoomId(),
    defaultRoomConfigured: !!(userConfig.roomId?.trim() || ROOM_ID),
    supabase: !!rt,
    cloudReady: !!rt,
    cloudSyncError: getLastAuthError(),
    ttsGoogle: !!resolveGoogleApiKey(),
    dataDir: activeDataDir(),
    setup,
  });
});

app.get('/api/setup', (_req, res) => {
  res.json({
    ...userConfig,
    ...buildSetupStatus(),
  });
});

app.put('/api/setup', async (req, res) => {
  const body = req.body || {};
  const nextRoom =
    body.roomId != null ? String(body.roomId).trim() : userConfig.roomId;
  userConfig = saveUserConfig(BASE_DATA, {
    roomId: nextRoom,
    dashboardUrl:
      body.dashboardUrl != null ? String(body.dashboardUrl) : userConfig.dashboardUrl,
    setupCompleted: body.setupCompleted ?? true,
    linkedAt: nextRoom ? new Date().toISOString() : userConfig.linkedAt,
    accessToken:
      body.accessToken != null ? String(body.accessToken) : userConfig.accessToken,
    refreshToken:
      body.refreshToken != null ? String(body.refreshToken) : userConfig.refreshToken,
  });
  const synced = await refreshSupabase();
  res.json({
    ok: true,
    cloudSynced: synced,
    ...buildSetupStatus(),
  });
});

/** เชื่อมห้องด้วยรหัสจากเว็บ (ไม่ต้องให้เบราว์เซอร์เรียก localhost) */
app.post('/api/setup/pair', async (req, res) => {
  const body = req.body || {};
  const roomCode = String(body.roomCode || body.code || '').trim();
  const pairingSecret = String(
    body.pairingSecret || body.secret || body.widgetSecret || ''
  ).trim();
  if (!roomCode || !pairingSecret) {
    res.status(400).json({ error: 'ใส่รหัสห้องและรหัสเชื่อมจากเว็บ' });
    return;
  }
  const db = await ensureSupabaseDb();
  if (!db) {
    res.status(503).json({
      error:
        getLastAuthError() ||
        'โปรแกรมยังไม่มี Supabase — build ใหม่พร้อม SUPABASE_URL + SERVICE_ROLE',
    });
    return;
  }
  try {
    const room = await resolveRoomForPairing(db, roomCode, pairingSecret);
    if (!room) {
      res.status(404).json({ error: 'รหัสห้องหรือรหัสเชื่อมไม่ถูกต้อง' });
      return;
    }
    userConfig = saveUserConfig(BASE_DATA, {
      roomId: room.id,
      dashboardUrl:
        body.dashboardUrl != null
          ? String(body.dashboardUrl)
          : userConfig.dashboardUrl || WEB_PUBLIC_URL,
      setupCompleted: true,
      linkedAt: new Date().toISOString(),
    });
    await touchConnectorLinked(db, room.id);
    const cloudSynced = await refreshSupabase();
    await reloadGiftConfigForRoom();
    await loadLiveExtrasFromCloud();
    const setup = buildSetupStatus();
    res.json({ ok: true, cloudSynced, ...setup, roomId: room.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

/** เชื่อมต่อครั้งเดียว: รับห้องจากเว็บ + TikTok (ถ้ามี) — ใช้เมื่อเว็บเรียก localhost ได้ */
app.post('/api/setup/quick', async (req, res) => {
  const body = req.body || {};
  const roomId = String(body.roomId || '').trim();
  if (!roomId) {
    res.status(400).json({ error: 'ต้องมีรหัสห้องจากบัญชีเว็บ' });
    return;
  }
  const accessToken =
    body.accessToken != null ? String(body.accessToken) : userConfig.accessToken;
  const refreshToken =
    body.refreshToken != null ? String(body.refreshToken) : userConfig.refreshToken;
  const linkedUserId =
    userIdFromAccessToken(accessToken) ?? userConfig.linkedUserId;

  userConfig = saveUserConfig(BASE_DATA, {
    roomId,
    dashboardUrl:
      body.dashboardUrl != null
        ? String(body.dashboardUrl)
        : userConfig.dashboardUrl,
    setupCompleted: true,
    linkedAt: new Date().toISOString(),
    accessToken,
    refreshToken,
    linkedUserId,
  });
  const cloudSynced = await refreshSupabase();
  const ownerErr = await assertRoomBelongsToLinkedUser(roomId);
  if (ownerErr) {
    res.status(403).json({ error: ownerErr, cloudSynced });
    return;
  }
  if (supabaseDb) {
    try {
      await touchConnectorLinked(supabaseDb, roomId);
    } catch {
      /* column อาจยังไม่มีจนกว่าจะรัน migration */
    }
  }
  await reloadGiftConfigForRoom();
  await loadLiveExtrasFromCloud();
  const username = String(body.tiktokUsername || body.username || '')
    .replace(/^@/, '')
    .trim();
  let tiktokError: string | null = null;
  if (username) {
    try {
      if (giftConnection) {
        await giftConnection.disconnect();
        giftConnection = null;
      }
      giftConnection = new WebcastPushConnection(username, {
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
        checkAndNotifyVip(data, 'chat');
      });
      giftConnection.on('error', (err: Error) =>
        console.warn('[TikTok]', err.message)
      );
      await giftConnection.connect();
      connectedRoom = username;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      tiktokError = /not.?live|offline|LIVE has ended/i.test(msg)
        ? 'TikTok: ห้องยังไม่ไลฟ์ — ข้ามไปก่อนได้ แล้วเชื่อมใหม่ตอนไลฟ์'
        : `TikTok: ${msg}`;
    }
  }
  const setup = buildSetupStatus();
  res.json({ ok: true, tiktokError, cloudSynced, ...setup });
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

app.get('/api/image-overlay/config', (req, res) => {
  imageOverlayConfig = loadImageOverlayConfig(activeDataDir());
  const webBase = String(req.query.webBase || WEB_PUBLIC_URL);
  res.json({
    config: imageOverlayConfig,
    slots: publicImageConfig(imageOverlayConfig, PUBLIC_URL, webBase),
  });
});

app.post('/api/image-overlay/upload', (req, res) => {
  const type = String(req.body?.type || '') as ImageSlot;
  if (!IMAGE_SLOTS.includes(type)) {
    res.status(400).json({ error: 'type must be positive|negative|heart|hammer' });
    return;
  }
  const dataUrl = String(req.body?.dataUrl || '');
  const filename = String(req.body?.filename || 'upload.png');
  const match = /^data:image\/[\w+.-]+;base64,(.+)$/.exec(dataUrl);
  if (!match) {
    res.status(400).json({ error: 'dataUrl required (base64 image)' });
    return;
  }
  try {
    const buffer = Buffer.from(match[1], 'base64');
    if (buffer.length > 8 * 1024 * 1024) {
      res.status(400).json({ error: 'file too large (max 8MB)' });
      return;
    }
    imageOverlayConfig = uploadImage(activeDataDir(), imageOverlayConfig, type, filename, buffer);
    const webBase = String(req.query.webBase || req.body?.webBase || WEB_PUBLIC_URL);
    res.json({
      ok: true,
      slots: publicImageConfig(imageOverlayConfig, PUBLIC_URL, webBase),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/image-overlay/reset', (req, res) => {
  const type = String(req.body?.type || '') as ImageSlot;
  if (!IMAGE_SLOTS.includes(type)) {
    res.status(400).json({ error: 'invalid type' });
    return;
  }
  imageOverlayConfig = clearImageSlot(activeDataDir(), imageOverlayConfig, type);
  const webBase = String(req.query.webBase || req.body?.webBase || WEB_PUBLIC_URL);
  res.json({
    ok: true,
    slots: publicImageConfig(imageOverlayConfig, PUBLIC_URL, webBase),
  });
});

app.get('/api/config/gift', async (_req, res) => {
  try {
    const room = effectiveRoomId();
    giftConfig = await loadGiftConfigForRoom(supabaseDb, activeDataDir(), room);
    res.json(giftConfig);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.put('/api/config/gift', async (req, res) => {
  const room = effectiveRoomId();
  const ownerErr = await assertRoomBelongsToLinkedUser(room);
  if (ownerErr) {
    res.status(403).json({ error: ownerErr });
    return;
  }
  try {
    giftConfig = { ...giftConfig, ...req.body };
    await saveGiftConfigForRoom(supabaseDb, activeDataDir(), room, giftConfig);
    res.json(giftConfig);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
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
    const userId = String(ev.uniqueId ?? ev.userId ?? 'guest');
    const nickname = String(ev.nickname ?? ev.displayName ?? userId);
    const coins = Number(ev.diamondCount ?? ev.coins ?? 1);
    const add = (Number.isFinite(coins) ? coins : 1) * finalRepeat;
    topDonors = bumpLeaderboard(topDonors, userId, nickname, add);
    void pushState();
    void rt?.broadcast(effectiveRoomId(), 'activity', {
      type: 'gift',
      giftId,
      giftName: giftNameRaw,
      repeatCount: finalRepeat,
    });
    checkAndNotifyVip(ev, 'gift');

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
  const ev = { ...req.body, mock: true, repeatEnd: true, repeatCount: req.body?.repeatCount ?? 1 };
  handleGiftPayload(ev);
  res.json({ ok: true, win: state.win, topDonors });
});

app.post('/api/mock/like', (req, res) => {
  const add = Math.max(1, Number(req.body?.count ?? req.body?.delta ?? 1));
  totalLikes += add;
  if (req.body?.likeGoal != null) {
    likeGoal = Number(req.body.likeGoal);
  }
  const userId = String(req.body?.uniqueId ?? req.body?.username ?? 'liker');
  const nickname = String(req.body?.nickname ?? userId);
  topLikers = bumpLeaderboard(topLikers, userId, nickname, add);
  void pushState();
  res.json({ ok: true, totalLikes, likeGoal, topLikers });
});

app.post('/api/mock/chat', (req, res) => {
  const comment = String(req.body?.comment ?? req.body?.text ?? 'ทดสอบแชท');
  const nickname = String(req.body?.nickname ?? 'ผู้ทดสอบ');
  const uniqueId = String(req.body?.uniqueId ?? req.body?.username ?? 'test_user');
  void rt?.broadcast(effectiveRoomId(), 'chat', {
    type: 'chat',
    comment,
    nickname,
    user: uniqueId,
  });
  checkAndNotifyVip(
    { uniqueId, nickname, comment },
    'chat'
  );
  res.json({ ok: true });
});

app.get('/api/config/viewer', (_req, res) => {
  viewerConfig = loadViewerConfig(activeDataDir());
  res.json({
    ...viewerConfig,
    sounds: listSoundFiles(activeDataDir()),
  });
});

app.put('/api/config/viewer', (req, res) => {
  const body = req.body || {};
  viewerConfig = saveViewerConfig(activeDataDir(), {
    enabled: body.enabled ?? viewerConfig.enabled,
    volume:
      typeof body.volume === 'number' ? body.volume : viewerConfig.volume,
    trackedUsers: Array.isArray(body.trackedUsers)
      ? body.trackedUsers
      : viewerConfig.trackedUsers,
    soundFiles: Array.isArray(body.soundFiles)
      ? body.soundFiles
      : viewerConfig.soundFiles,
  });
  res.json({ ok: true, ...viewerConfig, sounds: listSoundFiles(activeDataDir()) });
});

app.get('/api/config/sounds', (_req, res) => {
  soundConfig = loadSoundConfig(activeDataDir());
  viewerConfig = loadViewerConfig(activeDataDir());
  res.json({
    files: listSoundFiles(activeDataDir()),
    incrementFile: soundConfig.incrementFile,
    decrementFile: soundConfig.decrementFile,
    volume: viewerConfig.volume,
  });
});

app.put('/api/config/sounds', (req, res) => {
  const body = req.body || {};
  if (body.incrementFile != null) {
    soundConfig = saveSoundConfig(activeDataDir(), {
      ...soundConfig,
      incrementFile: String(body.incrementFile),
    });
  }
  if (body.decrementFile != null) {
    soundConfig = saveSoundConfig(activeDataDir(), {
      ...soundConfig,
      decrementFile: String(body.decrementFile),
    });
  }
  if (typeof body.volume === 'number') {
    viewerConfig = saveViewerConfig(activeDataDir(), {
      ...viewerConfig,
      volume: body.volume,
    });
  }
  res.json({
    ok: true,
    files: listSoundFiles(activeDataDir()),
    ...soundConfig,
    volume: viewerConfig.volume,
  });
});

app.get('/api/sounds', (_req, res) => {
  res.json({
    files: listSoundFiles(activeDataDir()),
    ...loadSoundConfig(activeDataDir()),
  });
});

app.post('/api/sounds/upload', (req, res) => {
  const filename = String(req.body?.filename || 'sound.mp3').replace(/[^\w.\-]/g, '_');
  const dataUrl = String(req.body?.dataUrl || '');
  const match = /^data:(audio\/[\w+.-]+|application\/octet-stream);base64,(.+)$/.exec(
    dataUrl
  );
  if (!match) {
    res.status(400).json({ error: 'dataUrl required (base64 audio)' });
    return;
  }
  try {
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'max 5MB' });
      return;
    }
    const sd = soundsDir(activeDataDir());
    fs.mkdirSync(sd, { recursive: true });
    fs.writeFileSync(path.join(sd, filename), buffer);
    const files = listSoundFiles(activeDataDir());
    if (!viewerConfig.soundFiles.includes(filename)) {
      viewerConfig.soundFiles = [...viewerConfig.soundFiles, filename];
      saveViewerConfig(activeDataDir(), viewerConfig);
    }
    res.json({ ok: true, filename, files });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/test/sound', async (req, res) => {
  const name = String(req.body?.name || 'test');
  const file = String(req.body?.file || '').trim() || undefined;
  const volume =
    typeof req.body?.volume === 'number' ? req.body.volume : viewerConfig.volume;
  await broadcastSound({ name, file, volume });
  res.json({
    ok: true,
    supabase: !!rt,
    hint: rt
      ? undefined
      : 'ซิงก์คลาวด์ปิด — ล็อกอินเว็บแล้วกดเชื่อมต่อทั้งหมด',
  });
});

app.post('/api/test/vip', async (req, res) => {
  const username = String(req.body?.username || 'vip_test')
    .replace(/^@/, '')
    .toLowerCase();
  const displayName = String(req.body?.displayName || username);
  const soundFile = String(
    req.body?.soundFile || viewerConfig.trackedUsers[0]?.soundFile || 'increment.mp3'
  );
  activeVips.delete(username);
  checkAndNotifyVip(
    { uniqueId: username, nickname: displayName, userId: username },
    'mock'
  );
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
      checkAndNotifyVip(data, 'chat');
    });
    giftConnection.on('error', (err: Error) =>
      console.warn('[TikTok]', err.message)
    );
    await giftConnection.connect();
    connectedRoom = roomId;
    res.json({ ok: true, username: roomId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    let friendly = msg;
    if (/not.?live|offline|LIVE has ended|room.?id/i.test(msg)) {
      friendly = 'ห้องยังไม่ไลฟ์ หรือชื่อผู้ใช้ไม่ถูกต้อง — ลองตอนเริ่มไลฟ์จริง';
    } else if (/ECONNREFUSED|timeout|ETIMEDOUT/i.test(msg)) {
      friendly = 'เชื่อม TikTok ไม่ได้ — ตรวจอินเทอร์เน็ต';
    }
    res.status(500).json({ error: friendly });
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
  tts.saveSettingsFile(activeDataDir(), ttsSettings);
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

  res.json({
    ok: true,
    engine: 'web_speech',
    audioUrl: null,
    text,
    message: 'ใช้เสียงพื้นฐานของเบราว์เซอร์ (ฟรี)',
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

const server = app.listen(PORT, () => {
  console.log(`[TheSteamerZone] connector http://127.0.0.1:${PORT}`);
  console.log(`[TheSteamerZone] data: ${activeDataDir()}`);
  if (!userConfig.roomId?.trim() && !ROOM_ID) {
    console.warn(
      '[TheSteamerZone] ยังไม่มีรหัสห้อง — ดูรหัสบนเว็บแล้วกรอกในโปรแกรม'
    );
  }
  if (!rt) console.warn('[TheSteamerZone] ซิงก์คลาวด์ปิดอยู่ (ผู้ดูแลตั้งค่าเซิร์ฟเวอร์ครั้งเดียว)');
});

setInterval(() => {
  const roomId = userConfig.roomId?.trim();
  if (!roomId || !supabaseDb || !userConfig.setupCompleted) return;
  void touchConnectorLinked(supabaseDb, roomId).catch(() => {});
}, 30_000);

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      '[TheSteamerZone] พอร์ต 8780 ถูกใช้อยู่แล้ว — ปิดโปรแกรม Connector ตัวอื่น (Task Manager)'
    );
    process.exit(1);
  }
  throw err;
});
