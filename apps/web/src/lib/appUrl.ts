/** URL หลักของแอป (production) — ตั้งบน Vercel เป็น https://thesteamerzone.vercel.app */
export function getConfiguredAppUrl(): string | null {
  const u = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  return u ? u.replace(/\/$/, '') : null;
}

/** Origin สำหรับลิงก์วิดเจ็ต / OAuth (ใช้ค่าจาก env บน production) */
export function getAppOrigin(): string {
  return getConfiguredAppUrl() || window.location.origin;
}

export function oauthRedirectPath(): string {
  return `${getAppOrigin()}/app/connection`;
}

export function widgetBaseUrl(): string {
  return getAppOrigin();
}
