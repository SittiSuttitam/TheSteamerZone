import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, supabaseConfigured } = useAuth();
  const location = useLocation();

  if (!supabaseConfigured) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-950 shadow-card">
          <h1 className="mb-3 text-lg font-semibold">ยังไม่ได้ตั้งค่า Supabase</h1>
          <p className="mb-4 text-sm leading-relaxed">
            สร้างไฟล์ <code className="rounded bg-white/80 px-1">apps/web/.env</code> จาก{' '}
            <code className="rounded bg-white/80 px-1">.env.example</code> แล้วใส่ค่า{' '}
            <code className="rounded bg-white/80 px-1">VITE_SUPABASE_URL</code> และ{' '}
            <code className="rounded bg-white/80 px-1">VITE_SUPABASE_ANON_KEY</code>{' '}
            จากโปรเจกต์ Supabase ของคุณ จากนั้นรีสตาร์ทเซิร์ฟเวอร์ท้องถิ่น
          </p>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-tsz-accent underline"
          >
            เปิดหน้า Supabase
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-tsz-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-tsz-border border-t-tsz-accent" />
        <p className="text-sm text-tsz-muted">กำลังโหลด…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
