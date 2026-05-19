import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { redirectOffLocalhostAfterOAuth } from '../lib/productionRedirect';

/** เส้นทางเก่า /auth/callback — ส่งต่อไป /app/connection (แลก code ใน AuthProvider) */
export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    redirectOffLocalhostAfterOAuth();
    navigate('/app/connection', { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-zinc-950 p-8 text-center text-white">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white"
        aria-hidden
      />
      <p className="text-sm text-white/80">กำลังเข้าสู่ระบบ…</p>
    </div>
  );
}
