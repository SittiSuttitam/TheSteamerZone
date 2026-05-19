import type { ReactNode } from 'react';
import { BrandLogo } from './BrandLogo';

type Props = {
  children: ReactNode;
  hero?: boolean;
};

export function AppShell({ children, hero = false }: Props) {
  return (
    <section className="relative flex min-h-full flex-col">
      <div className="tsz-app-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="tsz-app-bg-glow pointer-events-none fixed inset-0 -z-10" aria-hidden />

      {hero ? (
        <header className="flex flex-col items-center px-6 pb-2 pt-10 md:pt-14">
          <BrandLogo size="lg" />
        </header>
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>

      <footer className="relative z-10 px-6 py-4 text-center">
        <p className="text-xs text-white/50">
          Created by{' '}
          <span className="font-medium text-white/80">The Jest Zone</span>
        </p>
      </footer>
    </section>
  );
}
