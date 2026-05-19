import { getProductionSiteUrl, isLocalDevHost } from './appUrl';

/** มีพารามิเตอร์ OAuth กลับมาหลังล็อกอิน */
function hasOAuthCallback(): boolean {
  const { search, hash } = window.location;
  return (
    hash.includes('access_token') ||
    hash.includes('error=') ||
    search.includes('code=') ||
    search.includes('error=')
  );
}

/**
 * ถ้า Supabase ยังตั้ง Site URL เป็น localhost — พา token ไป production
 * รันซิงก์ก่อน React mount
 */
export function redirectOffLocalhostAfterOAuth(): void {
  if (!isLocalDevHost()) return;
  if (!hasOAuthCallback()) return;

  const prod = getProductionSiteUrl();
  const target = new URL(prod);
  const path = window.location.pathname;
  const isAuthPath =
    path === '/' ||
    path === '/login' ||
    path === '/auth/callback' ||
    path.startsWith('/auth/');
  target.pathname = isAuthPath ? '/app/connection' : path;
  target.search = window.location.search;
  target.hash = window.location.hash;
  window.location.replace(target.href);
}
