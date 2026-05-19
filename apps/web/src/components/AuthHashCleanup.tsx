import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** ลบ #access_token ออกจาก URL หลัง OAuth และพาเข้าแดชบอร์ด */
export function AuthHashCleanup() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || (!hash.includes('access_token') && !hash.includes('error='))) return;

    const path = window.location.pathname;
    const target =
      path === '/' || path === '/login' ? '/app/connection' : path;

    window.history.replaceState(null, '', target + window.location.search);
    if (path === '/' || path === '/login') {
      navigate(target, { replace: true });
    }
  }, [navigate]);

  return null;
}
