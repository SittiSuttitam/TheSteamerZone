#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readEnv(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return null;
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function ok(label, pass, hint = '') {
  const icon = pass ? '✓' : '✗';
  console.log(`${icon} ${label}${hint ? ` — ${hint}` : ''}`);
  return pass;
}

function filled(v) {
  return typeof v === 'string' && v.length > 0 && !v.includes('YOUR_') && !v.includes('your_');
}

async function ping(url) {
  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

const web = readEnv('apps/web/.env');
const conn = readEnv('apps/connector/.env');
let all = true;

console.log('\n=== ตรวจการตั้งค่า TheSteamerZone ===\n');

all = ok('ไฟล์ apps/web/.env', !!web, web ? '' : 'รัน npm run setup') && all;
if (web) {
  all = ok('VITE_SUPABASE_URL', filled(web.VITE_SUPABASE_URL)) && all;
  const pubKey =
    web.VITE_SUPABASE_PUBLISHABLE_KEY || web.VITE_SUPABASE_ANON_KEY;
  all =
    ok(
      'VITE_SUPABASE key',
      filled(pubKey),
      'PUBLISHABLE_KEY หรือ ANON_KEY'
    ) && all;
  all =
    ok(
      'VITE_CONNECTOR_URL',
      filled(web.VITE_CONNECTOR_URL) || true,
      web.VITE_CONNECTOR_URL || 'http://127.0.0.1:8780'
    ) && all;
}

all = ok('ไฟล์ apps/connector/.env', !!conn) && all;
if (conn) {
  all = ok('SUPABASE_URL', filled(conn.SUPABASE_URL)) && all;
  const hasCloudKey =
    filled(conn.SUPABASE_SERVICE_ROLE_KEY) ||
    filled(conn.SUPABASE_ANON_KEY) ||
    filled(conn.SUPABASE_PUBLISHABLE_KEY);
  all =
    ok(
      'Supabase คีย์ Connector',
      hasCloudKey,
      'SERVICE_ROLE หรือ ANON/PUBLISHABLE'
    ) && all;
  all =
    ok(
      'DEFAULT_ROOM_ID',
      filled(conn.DEFAULT_ROOM_ID),
      'UUID จาก Supabase → rooms.id (หน้าสตูดิโอ)'
    ) && all;
}

const connectorUrl =
  (web && web.VITE_CONNECTOR_URL) || 'http://127.0.0.1:8780';
const health = await ping(connectorUrl);
if (health) {
  ok('Connector ทำงาน', true, connectorUrl);
  ok('Connector ↔ Supabase', !!health.supabase, health.supabase ? '' : 'ใส่ SERVICE_ROLE ใน .env');
  ok('TikTok เชื่อมแล้ว', !!health.tiktok, health.tiktok ? '' : 'ยังไม่เชื่อม (ปกติ)');
} else {
  all = ok('Connector ทำงาน', false, `เปิด npm run dev:connector ที่ ${connectorUrl}`) && all;
}

console.log(all ? '\nพร้อมใช้งาน (ตรวจรายการที่ยัง ✗)\n' : '\nยังตั้งไม่ครบ — ดู SETUP_TH.md\n');
process.exit(all ? 0 : 1);
