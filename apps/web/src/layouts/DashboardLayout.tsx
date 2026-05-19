import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppShell } from '../components/AppShell';
import { BrandLogo } from '../components/BrandLogo';

const tabs = [
  { to: '/app/connection', label: 'เริ่มใช้งาน' },
  { to: '/app/voice', label: 'เสียง & TTS (เร็วๆ นี้)' },
  { to: '/app/rules', label: 'กฎของขวัญ' },
  { to: '/app/widgets', label: 'Widgets' },
  { to: '/app/images', label: 'รูปภาพ' },
];

export function DashboardLayout() {
  const { user, signOut } = useAuth();
  const email = user?.email ?? user?.id?.slice(0, 8) ?? '';

  return (
    <AppShell>
      <div className="flex min-h-full flex-col md:flex-row">
        <aside className="tsz-glass-sidebar border-b border-white/10 px-6 py-4 shadow-card md:w-60 md:border-b-0 md:border-r">
          <div className="mb-6">
            <BrandLogo size="sm" showSubtitle={false} />
            <p className="mt-2 text-center text-xs text-white/50">แดชบอร์ดสตรีม</p>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-white/15 font-medium text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-8 hidden border-t border-white/10 pt-6 md:block">
            <p className="mb-2 truncate text-xs text-white/50" title={email}>
              {email}
            </p>
            <button
              type="button"
              className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm text-white/90 transition hover:bg-white/10"
              onClick={() => void signOut()}
            >
              ออกจากระบบ
            </button>
          </div>
        </aside>
        <main className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-6 py-3 backdrop-blur md:hidden">
            <span className="min-w-0 truncate text-xs text-white/60">{email}</span>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/90"
              onClick={() => void signOut()}
            >
              ออกจากระบบ
            </button>
          </header>
          <div className="flex-1 overflow-auto p-4 md:p-8">
            <div className="tsz-glass mx-auto min-h-[60vh] max-w-5xl rounded-2xl p-6 shadow-card md:p-10">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
