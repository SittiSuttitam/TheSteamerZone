/** Production site — ฝังใน build เพื่อ OAuth / ลิงก์วิดเจ็ต ไม่พึ่ง localhost */
export const PRODUCTION_SITE = 'https://thesteamerzone.vercel.app';

/** URL หลักของแอปบน production (จาก env หรือค่าคงที่) */
export function getProductionSiteUrl(): string {
  const fromEnv = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  const base = fromEnv || PRODUCTION_SITE;
  return base.replace(/\/$/, '');
}

/** ใช้เมื่อต้องการบังคับ production URL ใน build จริง */
export function getConfiguredAppUrl(): string | null {
  if (import.meta.env.DEV) {
    const u = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
    return u ? u.replace(/\/$/, '') : null;
  }
  return getProductionSiteUrl();
}

/**
 * Origin สำหรับ OAuth redirect และลิงก์วิดเจ็ต
 * - Production build: ใช้ Vercel เสมอ (ไม่ใช้ localhost)
 * - Dev: ใช้ localhost ยกเว้นตั้ง VITE_APP_URL
 */
export function getAppOrigin(): string {
  if (!import.meta.env.DEV) {
    return getProductionSiteUrl();
  }
  const configured = getConfiguredAppUrl();
  if (configured) return configured;
  return window.location.origin;
}

/** OAuth กลับหน้าเริ่มใช้งานบน production เสมอ — ห้ามใช้ localhost */
export function oauthRedirectPath(): string {
  return `${getProductionSiteUrl()}/app/connection`;
}

export function widgetBaseUrl(): string {
  return getAppOrigin();
}

export function isLocalDevHost(): boolean {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}
