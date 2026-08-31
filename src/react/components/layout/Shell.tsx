import { useState, type ReactNode } from 'react';
import { useI18n } from '../../../i18n';
import { NavDrawer } from './NavDrawer';
import { PersistentSidebar } from './PersistentSidebar';
import { OfflineIndicator } from '../OfflineIndicator';
import { OrientationToggle } from '../OrientationToggle';
import { FullscreenToggle } from '../FullscreenToggle';
import { MenuIcon } from '../icons';

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-row">
      <PersistentSidebar />
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label={t('nav.openMenu')}
        className="fixed left-safe-3 top-safe-3 z-30 flex touch-target items-center justify-center rounded-full text-white shadow-lg backdrop-blur-md transition-transform hover:scale-105 active:scale-95 lg:hidden"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      >
        <MenuIcon size={22} />
      </button>
      <OrientationToggle />
      <FullscreenToggle />
      <main className="min-w-0 flex-1">{children}</main>
      <OfflineIndicator />
      {drawerOpen && <NavDrawer onClose={() => setDrawerOpen(false)} />}
    </div>
  );
}
