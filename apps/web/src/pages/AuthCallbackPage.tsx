import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import { redirectOffLocalhostAfterOAuth } from '../lib/productionRedirect';

/** รับ PKCE ?code= จาก Supabase แล้วพาเข้าแดชบอร์ด */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    redirectOffLocalhostAfterOAuth();

    const sb = getSupabase();
    if (!sb) {
      setErr('ยังไม่ตั้งค่า Supabase');
      return;
    }

    let cancelled = false;

    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error && !cancelled) {
          setErr(error.message);
          return;
        }
      } else {
        const { error } = await sb.auth.getSession();
        if (error && !cancelled) {
          setErr(error.message);
          return;
        }
      }
      if (!cancelled) {
        window.history.replaceState(null, '', '/app/connection');
        navigate('/app/connection', { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-zinc-950 p-8 text-center text-white">
      {err ? (
        <>
          <p className="text-red-300">{err}</p>
          <a href="/login" className="text-sm underline">
            ลองล็อกอินใหม่
          </a>
        </>
      ) : (
        <>
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white"
            aria-hidden
          />
          <p className="text-sm text-white/80">กำลังเข้าสู่ระบบ…</p>
        </>
      )}
    </div>
  );
}
