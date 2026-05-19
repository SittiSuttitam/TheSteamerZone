import fs from 'node:fs';
import path from 'node:path';

const FILE = 'desktop-active.json';
/** โปรแกรมหน้าต่างต้องส่ง heartbeat ภายในเวลานี้ */
const MAX_AGE_MS = 8000;

export function isDesktopAppOpen(dataDir: string): boolean {
  const p = path.join(dataDir, FILE);
  if (!fs.existsSync(p)) return false;
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as { at?: string };
    if (!raw.at) return false;
    return Date.now() - new Date(raw.at).getTime() < MAX_AGE_MS;
  } catch {
    return false;
  }
}
