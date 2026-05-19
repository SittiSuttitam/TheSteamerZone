/**
 * สร้าง TheSteamerZone Connector สำหรับ Windows (โฟลเดอร์ + .bat)
 * ผลลัพธ์: release/TheSteamerZone-Connector/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import https from 'node:https';
import { createWriteStream } from 'node:fs';
import { ROOT, copyDir, stageConnectorApp } from './stage-connector-app.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RELEASE = path.join(ROOT, 'release', 'TheSteamerZone-Connector');
const NODE_VERSION = '20.18.0';
const NODE_ZIP = `node-v${NODE_VERSION}-win-x64.zip`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ZIP}`;
const CACHE = path.join(ROOT, '.cache', 'node-win');
const NODE_DIR = path.join(CACHE, `node-v${NODE_VERSION}-win-x64`);

function log(msg) {
  console.log(`[build-connector-win] ${msg}`);
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
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
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
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
    log(`ดาวน์โหลด Node ${NODE_VERSION} …`);
    await download(NODE_URL, zipPath);
  }
  log('แตกไฟล์ Node …');
  run(
    `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${CACHE.replace(/'/g, "''")}' -Force"`
  );
  if (!fs.existsSync(nodeExe)) throw new Error('แตก Node ไม่สำเร็จ');
  return nodeExe;
}

function writeLauncherFiles() {
  const bat = `@echo off
chcp 65001 >nul
cd /d "%~dp0"
set TSZ_INSTALL_DIR=%~dp0
title TheSteamerZone Connector
if not exist ".env" (
  if exist ".env.example" copy /y ".env.example" ".env" >nul
)
echo.
echo  TheSteamerZone Connector
echo  http://127.0.0.1:8780
echo.
start "" "http://localhost:5173/app/connection" 2>nul
"node\\node.exe" "app\\entry.mjs"
if errorlevel 1 pause
`;
  fs.writeFileSync(path.join(RELEASE, 'TheSteamerZone Connector.bat'), bat, 'utf8');
  fs.copyFileSync(
    path.join(ROOT, 'apps/connector/.env.example'),
    path.join(RELEASE, '.env.example')
  );
}

async function main() {
  log('build shared + connector …');
  run('npm run build:shared');
  run('npm run build:connector');
  await ensureNodeRuntime();

  const stageDir = path.join(ROOT, '.cache', 'connector-stage');
  stageConnectorApp(stageDir);

  fs.rmSync(RELEASE, { recursive: true, force: true });
  fs.mkdirSync(RELEASE, { recursive: true });
  fs.mkdirSync(path.join(RELEASE, 'node'), { recursive: true });
  fs.copyFileSync(path.join(NODE_DIR, 'node.exe'), path.join(RELEASE, 'node', 'node.exe'));
  copyDir(stageDir, path.join(RELEASE, 'app'));
  const legacyIco = path.join(ROOT, '..', 'dist', '.icon-ico', 'icon.ico');
  const legacyPng = path.join(ROOT, '..', 'static', 'icon.png');
  if (fs.existsSync(legacyIco)) {
    fs.copyFileSync(legacyIco, path.join(RELEASE, 'icon.ico'));
  }
  if (fs.existsSync(legacyPng)) {
    fs.copyFileSync(legacyPng, path.join(RELEASE, 'icon.png'));
  }
  writeLauncherFiles();
  log(`เสร็จ → ${RELEASE}`);
  log('หรือใช้ npm run build:connector:desktop สำหรับโปรแกรมหน้าต่าง');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
