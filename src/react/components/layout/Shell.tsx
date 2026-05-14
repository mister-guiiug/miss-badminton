import { useState, type ReactNode } from 'react';
import { useI18n } from '../../../i18n/useI18n';
import { NavDrawer } from './NavDrawer';

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-dvh">
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label={t('nav.openMenu')}
        className="fixed left-safe-3 top-safe-3 z-30 flex touch-target items-center justify-center rounded-full text-lg text-white shadow-lg backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      >
        <span aria-hidden>☰</span>
      </button>
      <main className="flex-1">{children}</main>
      {drawerOpen && <NavDrawer onClose={() => setDrawerOpen(false)} />}
    </div>
  );
}
