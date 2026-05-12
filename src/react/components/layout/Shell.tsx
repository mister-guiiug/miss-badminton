import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="flex flex-col min-h-dvh">
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <span
          className="font-bold text-lg"
          style={{ color: 'var(--primary)' }}
        >
          🏸 Miss Badminton
        </span>
        <nav className="flex gap-3 text-sm font-medium" aria-label="Navigation principale">
          <NavLink
            to="/"
            end
            className={({ isActive }) => isActive ? 'underline' : ''}
            style={{ color: 'var(--text)' }}
          >
            Accueil
          </NavLink>
          <NavLink
            to="/match"
            className={({ isActive }) => isActive ? 'underline' : ''}
            style={{ color: 'var(--text)' }}
          >
            Match
          </NavLink>
          <NavLink
            to="/historique"
            className={({ isActive }) => isActive ? 'underline' : ''}
            style={{ color: 'var(--text)' }}
          >
            Historique
          </NavLink>
          <NavLink
            to="/parametres"
            className={({ isActive }) => isActive ? 'underline' : ''}
            style={{ color: 'var(--text)' }}
          >
            Paramètres
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
