const { app, BrowserWindow, shell, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const { resolveDashboardUrl } = require('./config.cjs');

const PORT = 8780;

let mainWindow = null;
let connectorProc = null;
let connectorOwned = false;
let logBuffer = [];

function connectorRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'connector');
  }
  const dev = process.env.TSZ_DEV_CONNECTOR_ROOT;
  if (dev && fs.existsSync(dev)) return dev;
  return path.join(__dirname, 'resources', 'connector');
}

function appIcon() {
  const png = path.join(__dirname, 'assets', 'icon.png');
  if (fs.existsSync(png)) {
    const img = nativeImage.createFromPath(png);
    if (!img.isEmpty()) return img;
  }
  return null;
}

function dataDirHint() {
  const base =
    process.platform === 'win32'
      ? process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming')
      : path.join(require('os').homedir(), '.config');
  return path.join(base, 'TheSteamerZone');
}

const HEARTBEAT_FILE = () => path.join(dataDirHint(), 'desktop-active.json');
let heartbeatTimer = null;

function writeHeartbeat() {
  const dir = dataDirHint();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    HEARTBEAT_FILE(),
    JSON.stringify({ at: new Date().toISOString(), pid: process.pid }),
    'utf8'
  );
}

function clearHeartbeat() {
  try {
    fs.unlinkSync(HEARTBEAT_FILE());
  } catch {
    /* ไม่มีไฟล์ */
  }
}

function startHeartbeat() {
  writeHeartbeat();
  heartbeatTimer = setInterval(writeHeartbeat, 2000);
}

async function shutdownBackend() {
  try {
    await fetch(`http://127.0.0.1:${PORT}/api/shutdown`, {
      method: 'POST',
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    /* backend หยุดแล้วหรือไม่มี */
  }
}

function pushLog(line) {
  const text = String(line).replace(/\r/g, '');
  logBuffer.push(text);
  if (logBuffer.length > 200) logBuffer = logBuffer.slice(-200);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log', text);
  }
}

async function isConnectorUp() {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function startConnectorChild() {
  if (connectorProc) return;

  const root = connectorRoot();
  const nodeExe = path.join(root, 'node', 'node.exe');
  const entry = path.join(root, 'app', 'entry.mjs');

  if (!fs.existsSync(nodeExe) || !fs.existsSync(entry)) {
    pushLog('[ERROR] ไม่พบไฟล์โปรแกรม — build ใหม่ด้วย npm run build:connector:desktop\n');
    return;
  }

  const env = {
    ...process.env,
    TSZ_INSTALL_DIR: root.endsWith(path.sep) ? root : root + path.sep,
  };

  connectorProc = spawn(nodeExe, [entry], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  connectorOwned = true;

  connectorProc.stdout.on('data', (d) => pushLog(d));
  connectorProc.stderr.on('data', (d) => pushLog(d));
  connectorProc.on('exit', (code) => {
    if (code === 1 && String(logBuffer.join('')).includes('EADDRINUSE')) {
      pushLog('[หมายเหตุ] พอร์ต 8780 ถูกใช้อยู่แล้ว — ถ้าเว็บเชื่อมได้ ไม่ต้องทำอะไร\n');
    } else if (code !== 0) {
      pushLog(`\n[connector หยุด] code=${code}\n`);
    }
    connectorProc = null;
    connectorOwned = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('connector-stopped', code);
    }
  });

  pushLog(`[เริ่ม Connector]\n`);
}

async function ensureConnector() {
  if (await isConnectorUp()) {
    pushLog('[OK] Connector ทำงานอยู่แล้ว (พอร์ต 8780)\n');
    return;
  }
  startConnectorChild();
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 400));
    if (await isConnectorUp()) return;
  }
  pushLog('[รอ Connector…] ถ้าไม่ขึ้น ปิดโปรแกรมนี้ทุกตัวใน Task Manager แล้วเปิดใหม่\n');
}

function stopConnector() {
  if (!connectorProc || !connectorOwned) return;
  connectorProc.kill('SIGTERM');
  setTimeout(() => {
    if (connectorProc) connectorProc.kill('SIGKILL');
  }, 2000);
}

function createWindow() {
  const icon = appIcon();
  mainWindow = new BrowserWindow({
    width: 440,
    height: 720,
    minWidth: 380,
    minHeight: 520,
    title: 'TheSteamerZone Connector',
    icon: icon || undefined,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

ipcMain.handle('get-status', async () => {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/health`);
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('connect-tiktok', async (_e, username) => {
  const res = await fetch(`http://127.0.0.1:${PORT}/api/tiktok/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: String(username || '').trim() }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(j.error || `เชื่อม TikTok ไม่สำเร็จ (${res.status})`);
  }
  return j;
});

ipcMain.handle('get-paths', () => {
  const dashboardUrl = resolveDashboardUrl({ connectorRoot: connectorRoot(), fs });
  return {
    connectorRoot: connectorRoot(),
    dataDir: dataDirHint(),
    port: PORT,
    dashboardUrl,
    connectionUrl: `${dashboardUrl}/app/connection`,
  };
});

ipcMain.handle('open-external', (_e, url) => {
  void shell.openExternal(url);
});

ipcMain.handle('open-path', (_e, p) => {
  const target = String(p || '');
  if (!target || !fs.existsSync(target)) {
    throw new Error('ไม่พบโฟลเดอร์');
  }
  void shell.openPath(target);
});

ipcMain.handle('get-logs', () => logBuffer.join(''));

ipcMain.handle('pair-room', async (_e, { roomCode, pairingSecret }) => {
  const res = await fetch(`http://127.0.0.1:${PORT}/api/setup/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomCode, pairingSecret }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `เชื่อมไม่สำเร็จ (${res.status})`);
  return j;
});

ipcMain.handle('restart-connector', async () => {
  stopConnector();
  await new Promise((r) => setTimeout(r, 800));
  await ensureConnector();
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    const icon = appIcon();
    if (icon) app.dock?.setIcon?.(icon);
    if (process.platform === 'win32') {
      app.setAppUserModelId('app.thesteamerzone.connector');
    }
    startHeartbeat();
    createWindow();
    await ensureConnector();
  });

  app.on('before-quit', () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    clearHeartbeat();
    stopConnector();
    void shutdownBackend();
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
