import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
/** ลบ auth params จาก URL หลัง OAuth + รองรับ PKCE (?code=) */
export function AuthHashCleanup() {
  const navigate = useNavigate();

  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const hasHashAuth =
      hash.includes('access_token') || hash.includes('error=');
    const hasQueryAuth =
      search.includes('code=') || search.includes('error=');

    if (!hasHashAuth && !hasQueryAuth) return;

    const target =
      pathname === '/' || pathname === '/login' ? '/app/connection' : pathname;

    const cleanUrl = target + (hasQueryAuth ? search : '');
    window.history.replaceState(null, '', cleanUrl);

    if (pathname === '/' || pathname === '/login') {
      navigate(target, { replace: true });
    }
  }, [navigate]);

  return null;
}
