/** รหัสห้องสั้นสำหรับแสดงบนเว็บ (8 ตัวแรกของ UUID) */
export function formatRoomCode(roomId: string): string {
  const id = roomId.replace(/-/g, '').toUpperCase();
  if (id.length < 8) return roomId;
  return `${id.slice(0, 4)}-${id.slice(4, 8)}`;
}

/** รหัสเชื่อม 8 ตัว — จาก widget_secret */
export function formatPairingSecret(widgetSecret: string): string {
  const hex = widgetSecret.replace(/[^a-fA-F0-9]/gi, '');
  return hex.slice(0, 8).toUpperCase();
}

export function compactRoomId(roomId: string): string {
  return roomId.replace(/-/g, '').toUpperCase();
}

/** ตรวจว่ารหัสที่ผู้ใช้กรอกตรงกับห้อง (รองรับ XXXX-XXXX หรือ UUID เต็ม) */
export function matchesRoomCode(roomId: string, input: string): boolean {
  const raw = input.trim();
  if (!raw) return false;
  const compact = raw.replace(/-/g, '').toUpperCase();
  const rid = compactRoomId(roomId);
  if (/^[0-9a-f]{36}$/i.test(raw)) {
    return roomId.toLowerCase() === raw.toLowerCase();
  }
  if (compact.length === 32) return rid === compact;
  if (compact.length === 8) return rid.startsWith(compact);
  return false;
}

export function pairingSecretMatches(
  widgetSecret: string,
  input: string
): boolean {
  const stored = widgetSecret.trim().toLowerCase();
  const given = input.trim().toLowerCase().replace(/[^a-f0-9]/g, '');
  if (!given) return false;
  if (stored === given) return true;
  if (stored.startsWith(given) && given.length >= 8) return true;
  if (given.length >= 8 && stored.startsWith(given.slice(0, 8))) return true;
  return false;
}
