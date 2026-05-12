import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../../../i18n/useI18n';
import { LOCALES, LOCALE_LABELS } from '../../../i18n/messages';

interface NavDrawerProps {
  onClose: () => void;
}

const ROUTES = [
  { to: '/', end: true, key: 'nav.home' as const },
  { to: '/match', end: false, key: 'nav.match' as const },
  { to: '/historique', end: false, key: 'nav.history' as const },
  { to: '/parametres', end: false, key: 'nav.settings' as const },
];

export function NavDrawer({ onClose }: NavDrawerProps) {
  const { t, locale, setLocale } = useI18n();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousActive = document.activeElement as HTMLElement | null;
    drawerRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previousActive?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-hidden
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.menuLabel')}
        tabIndex={-1}
        className="relative z-10 flex h-full w-80 max-w-[85vw] flex-col gap-4 p-5 shadow-2xl outline-none"
        style={{ background: 'var(--surface)', color: 'var(--text)' }}
      >
        <header className="flex items-center justify-between">
          <span
            className="text-lg font-bold"
            style={{ color: 'var(--primary)' }}
          >
            🏸 {t('appName')}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.closeMenu')}
            className="rounded-md px-2 py-1 text-xl leading-none hover:bg-black/5"
            style={{ color: 'var(--muted)' }}
          >
            ×
          </button>
        </header>

        <nav className="flex flex-col gap-1">
          {ROUTES.map(route => (
            <NavLink
              key={route.to}
              to={route.to}
              end={route.end}
              onClick={onClose}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? '' : 'hover:bg-black/5'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text)',
              })}
            >
              {t(route.key)}
            </NavLink>
          ))}
        </nav>

        <div
          className="mt-auto flex flex-col gap-2 border-t pt-3"
          style={{ borderColor: 'var(--border)' }}
        >
          <span
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--muted)' }}
          >
            {t('settings.languageLabel')}
          </span>
          <div className="flex flex-wrap gap-2">
            {LOCALES.map(l => {
              const selected = l === locale;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  aria-pressed={selected}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                  style={{
                    borderColor: selected ? 'var(--primary)' : 'var(--border)',
                    background: selected ? 'var(--primary)' : 'transparent',
                    color: selected ? '#fff' : 'var(--text)',
                  }}
                >
                  {LOCALE_LABELS[l]}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
