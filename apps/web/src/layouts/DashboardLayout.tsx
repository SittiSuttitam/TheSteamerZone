import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const tabs = [
  { to: '/app/connection', label: 'เชื่อมต่อ' },
  { to: '/app/voice', label: 'เสียง & TTS' },
  { to: '/app/rules', label: 'กฎของขวัญ' },
  { to: '/app/studio', label: 'สตูดิโอ OBS' },
  { to: '/app/design-preview', label: 'ตัวอย่างดีไซน์' },
];

export function DashboardLayout() {
  const { user, signOut } = useAuth();
  const email = user?.email ?? user?.id?.slice(0, 8) ?? '';

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="border-b border-tsz-border bg-tsz-surface px-6 py-4 shadow-card md:w-56 md:border-b-0 md:border-r">
        <div className="mb-6">
          <div className="font-semibold tracking-tight text-tsz-text">TheSteamerZone</div>
          <p className="mt-1 text-xs text-tsz-muted">แดชบอร์ดสตรีม</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-tsz-bg font-medium text-tsz-accent'
                    : 'text-tsz-muted hover:bg-tsz-bg/80'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8 hidden border-t border-tsz-border pt-6 md:block">
          <p className="mb-2 truncate text-xs text-tsz-muted" title={email}>
            {email}
          </p>
          <button
            type="button"
            className="w-full rounded-lg border border-tsz-border px-3 py-2 text-sm text-tsz-text transition hover:bg-tsz-bg"
            onClick={() => void signOut()}
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>
      <main className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-tsz-border bg-tsz-surface/80 px-6 py-3 backdrop-blur md:hidden">
          <span className="min-w-0 truncate text-xs text-tsz-muted">{email}</span>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-tsz-border px-3 py-1.5 text-xs text-tsz-text"
            onClick={() => void signOut()}
          >
            ออกจากระบบ
          </button>
        </header>
        <div className="flex-1 overflow-auto p-6 md:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
