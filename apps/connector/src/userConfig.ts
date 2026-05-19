import fs from 'node:fs';
import path from 'node:path';

/** ตั้งค่าที่ผู้ใช้ทั่วไปเข้าใจ — ไม่ต้องแก้ .env */
export interface UserConfigFile {
  /** รหัสห้องจากเว็บ (UUID) */
  roomId?: string;
  /** ที่อยู่แดชบอร์ดที่ใช้ล็อกอิน */
  dashboardUrl?: string;
  setupCompleted?: boolean;
  /** เวลาที่เว็บส่งห้องมาล่าสุด */
  linkedAt?: string;
  /** จากเว็บหลังล็อกอิน — ใช้แทน service_role บนเครื่องผู้ใช้ */
  accessToken?: string;
  refreshToken?: string;
  /** auth.users.id — แยกโฟลเดอร์ gift/sound ต่อบัญชี */
  linkedUserId?: string;
}

const FILE = 'user-config.json';

export function loadUserConfig(dataDir: string): UserConfigFile {
  const p = path.join(dataDir, FILE);
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as UserConfigFile;
  } catch {
    return {};
  }
}

export function saveUserConfig(dataDir: string, patch: UserConfigFile): UserConfigFile {
  const cur = loadUserConfig(dataDir);
  const next: UserConfigFile = {
    ...cur,
    ...patch,
    roomId: patch.roomId !== undefined ? String(patch.roomId).trim() : cur.roomId,
    dashboardUrl:
      patch.dashboardUrl !== undefined
        ? String(patch.dashboardUrl).trim()
        : cur.dashboardUrl,
  };
  const p = path.join(dataDir, FILE);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

export function formatRoomCode(roomId: string): string {
  const id = roomId.replace(/-/g, '').toUpperCase();
  if (id.length < 8) return roomId;
  return `${id.slice(0, 4)}-${id.slice(4, 8)}`;
}
