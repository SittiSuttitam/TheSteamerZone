#!/usr/bin/env node
/**
 * คัดลอก .env.example → .env (ถ้ายังไม่มี) และติดตั้ง dependencies
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const pairs = [
  ['apps/web/.env.example', 'apps/web/.env'],
  ['apps/connector/.env.example', 'apps/connector/.env'],
];

function copyIfMissing(relExample, relTarget) {
  const ex = path.join(root, relExample);
  const tgt = path.join(root, relTarget);
  if (!fs.existsSync(ex)) {
    console.warn(`⚠ ไม่พบ ${relExample}`);
    return false;
  }
  if (fs.existsSync(tgt)) {
    console.log(`✓ มีอยู่แล้ว: ${relTarget}`);
    return true;
  }
  fs.copyFileSync(ex, tgt);
  console.log(`+ สร้างแล้ว: ${relTarget}  ← แก้ไขใส่คีย์ Supabase`);
  return true;
}

console.log('\n=== TheSteamerZone setup ===\n');
for (const [ex, tgt] of pairs) copyIfMissing(ex, tgt);

console.log('\n→ ติดตั้ง npm packages...\n');
const npm = spawnSync('npm', ['install'], { cwd: root, stdio: 'inherit', shell: true });
if (npm.status !== 0) process.exit(npm.status ?? 1);

console.log(`
ขั้นตอนถัดไป (อ่านรายละเอียดใน SETUP_TH.md):

1. สร้างโปรเจกต์ที่ https://supabase.com
2. รัน SQL ใน supabase/migrations/ (ทั้งสองไฟล์) ใน SQL Editor
3. ใส่ค่าใน apps/web/.env และ apps/connector/.env
4. Auth → Google + Redirect URLs: http://localhost:5173
5. สร้างแถว rooms หรือล็อกอิน Google แล้วไปหน้า สตูดิโอ (สร้างห้องอัตโนมัติ)
6. คัดลอก rooms.id → DEFAULT_ROOM_ID ใน connector .env

รันทดสอบ:  npm run setup:check
รัน dev:     npm run dev:connector   (เทอร์มินัล 1)
             npm run dev:web         (เทอร์มินัล 2)
`);
