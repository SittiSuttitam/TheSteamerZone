import path from 'node:path';
import { getDataDir } from './config.js';

/** ดึง user id จาก JWT access token (ไม่ verify — ใช้แยกโฟลเดอร์เท่านั้น) */
export function userIdFromAccessToken(accessToken: string | undefined): string | null {
  const token = accessToken?.trim();
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(json) as { sub?: string };
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/** โฟลเดอร์ข้อมูลต่อบัญชี — แยก gift/sound/tts ระหว่างผู้ใช้บนเครื่องเดียวกัน */
export function resolveAccountDataDir(
  baseDir: string,
  linkedUserId: string | undefined
): string {
  const uid = linkedUserId?.trim();
  if (!uid) return baseDir;
  return path.join(baseDir, 'accounts', uid);
}

export function resolveBaseDataDir(explicit?: string): string {
  return getDataDir(explicit);
}
