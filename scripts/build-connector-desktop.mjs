/**
 * Build TheSteamerZone Connector เป็นโปรแกรมหน้าต่าง (Electron)
 * ผลลัพธ์: release/desktop/TheSteamerZone-Connector-*-portable.exe
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import https from 'node:https';
import { createWriteStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ROOT, copyDir, stageConnectorApp } from './stage-connector-app.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NODE_VERSION = '20.18.0';
const NODE_ZIP = `node-v${NODE_VERSION}-win-x64.zip`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ZIP}`;
const CACHE = path.join(ROOT, '.cache', 'node-win');
const NODE_DIR = path.join(CACHE, `node-v${NODE_VERSION}-win-x64`);
const DESKTOP = path.join(ROOT, 'apps', 'connector-desktop');
const RES = path.join(DESKTOP, 'resources', 'connector');

function log(msg) {
  console.log(`[build-desktop] ${msg}`);
}

function run(cmd, cwd = ROOT) {
  execSync(cmd, { stdio: 'inherit', cwd });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', reject);
  });
}

async function ensureNodeRuntime() {
  const nodeExe = path.join(NODE_DIR, 'node.exe');
  if (fs.existsSync(nodeExe)) return nodeExe;
  const zipPath = path.join(CACHE, NODE_ZIP);
  if (!fs.existsSync(zipPath)) {
    log(`ดาวน์โหลด Node ${NODE_VERSION}…`);
    await download(NODE_URL, zipPath);
  }
  log('แตกไฟล์ Node …');
  run(
    `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${CACHE.replace(/'/g, "''")}' -Force"`
  );
  if (!fs.existsSync(nodeExe)) throw new Error('Node runtime missing after extract');
  return nodeExe;
}

function ensureDesktopIcons() {
  const buildDir = path.join(DESKTOP, 'build');
  const assetsDir = path.join(DESKTOP, 'assets');
  const legacyPng = path.join(ROOT, '..', 'static', 'icon.png');
  const legacyIco = path.join(ROOT, '..', 'dist', '.icon-ico', 'icon.ico');
  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });
  const pngDest = path.join(buildDir, 'icon.png');
  const assetsPng = path.join(assetsDir, 'icon.png');
  if (fs.existsSync(legacyPng)) {
    if (!fs.existsSync(pngDest)) fs.copyFileSync(legacyPng, pngDest);
    if (!fs.existsSync(assetsPng)) fs.copyFileSync(legacyPng, assetsPng);
  }
  const icoDest = path.join(buildDir, 'icon.ico');
  if (fs.existsSync(legacyIco) && !fs.existsSync(icoDest)) {
    fs.copyFileSync(legacyIco, icoDest);
  }
  if (!fs.existsSync(icoDest) || !fs.existsSync(assetsPng)) {
    throw new Error('ไม่พบ icon — วาง static/icon.png ในโปรเจกต์เก่า');
  }
  log('ใช้ไอคอนจากโปรเจกต์เก่า (static/icon.png)');
}

async function main() {
  ensureDesktopIcons();
  log('compile shared + connector …');
  run('npm run build:shared');
  run('npm run build:connector');

  await ensureNodeRuntime();

  const stageDir = path.join(ROOT, '.cache', 'connector-stage');
  stageConnectorApp(stageDir);

  fs.rmSync(RES, { recursive: true, force: true });
  fs.mkdirSync(path.join(RES, 'node'), { recursive: true });
  fs.mkdirSync(path.join(RES, 'app'), { recursive: true });

  fs.copyFileSync(path.join(NODE_DIR, 'node.exe'), path.join(RES, 'node', 'node.exe'));
  copyDir(stageDir, path.join(RES, 'app'));

  // ผู้ build ใส่ apps/connector/.env ก่อน build — จะฝังในโปรแกรม (ผู้ใช้ทั่วไปไม่เห็น)
  const builderEnv = path.join(ROOT, 'apps/connector/.env');
  const PRODUCTION_WEB = 'https://thesteamerzone.vercel.app';
  if (fs.existsSync(builderEnv)) {
    let envText = fs.readFileSync(builderEnv, 'utf8');
    if (/^WEB_PUBLIC_URL\s*=/m.test(envText)) {
      envText = envText.replace(
        /^WEB_PUBLIC_URL\s*=.*$/m,
        `WEB_PUBLIC_URL=${PRODUCTION_WEB}`
      );
    } else {
      envText = `${envText.trimEnd()}\nWEB_PUBLIC_URL=${PRODUCTION_WEB}\n`;
    }
    fs.writeFileSync(path.join(RES, '.env'), envText);
    const envTextCheck = envText;
    const hasUrl = /SUPABASE_URL=\s*\S+/.test(envTextCheck);
    const hasKey =
      /SUPABASE_SERVICE_ROLE_KEY=\s*\S+/.test(envTextCheck) ||
      /SUPABASE_ANON_KEY=\s*\S+/.test(envTextCheck) ||
      /SUPABASE_PUBLISHABLE_KEY=\s*\S+/.test(envTextCheck);
    if (hasUrl && hasKey) {
      log('ฝัง Supabase จาก apps/connector/.env');
    } else {
      log('คำเตือน: .env ยังไม่ครบ SUPABASE_URL + ANON หรือ SERVICE_ROLE');
    }
  } else {
    log('คำเตือน: ไม่มี apps/connector/.env');
  }

  log('ติดตั้ง Electron (ใน apps/connector-desktop) …');
  run('npm install', DESKTOP);

  log('electron-builder (portable) …');
  run('npx electron-builder --win portable --config electron-builder.yml', DESKTOP);

  log('เสร็จ — ดูใน release/desktop/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
