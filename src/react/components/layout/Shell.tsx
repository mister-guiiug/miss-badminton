import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../../../i18n/useI18n';

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col min-h-dvh">
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 py-3"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span className="font-bold text-lg" style={{ color: 'var(--primary)' }}>
          🏸 {t('appName')}
        </span>
        <nav
          className="flex gap-3 text-sm font-medium"
          aria-label={t('nav.home')}
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'underline' : '')}
            style={{ color: 'var(--text)' }}
          >
            {t('nav.home')}
          </NavLink>
          <NavLink
            to="/match"
            className={({ isActive }) => (isActive ? 'underline' : '')}
            style={{ color: 'var(--text)' }}
          >
            {t('nav.match')}
          </NavLink>
          <NavLink
            to="/historique"
            className={({ isActive }) => (isActive ? 'underline' : '')}
            style={{ color: 'var(--text)' }}
          >
            {t('nav.history')}
          </NavLink>
          <NavLink
            to="/parametres"
            className={({ isActive }) => (isActive ? 'underline' : '')}
            style={{ color: 'var(--text)' }}
          >
            {t('nav.settings')}
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
