import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../../../i18n/useI18n';
import { LOCALES, LOCALE_FLAGS, LOCALE_LABELS } from '../../../i18n/messages';
import { Logo } from '../Logo';
import { HistoryIcon, HomeIcon, SettingsIcon, XIcon } from '../icons';

interface NavDrawerProps {
  onClose: () => void;
}

const ROUTES = [
  { to: '/', end: true, key: 'nav.home' as const, Icon: HomeIcon },
  {
    to: '/historique',
    end: false,
    key: 'nav.history' as const,
    Icon: HistoryIcon,
  },
  {
    to: '/parametres',
    end: false,
    key: 'nav.settings' as const,
    Icon: SettingsIcon,
  },
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
        className="relative z-10 flex h-full w-80 max-w-[85vw] flex-col gap-4 p-5 pt-safe pb-safe pl-safe shadow-2xl outline-none"
        style={{ background: 'var(--surface)', color: 'var(--text)' }}
      >
        <header className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-2 text-lg font-bold"
            style={{ color: 'var(--primary)' }}
          >
            <Logo size={28} />
            {t('appName')}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.closeMenu')}
            className="flex touch-target items-center justify-center rounded-md hover:bg-black/5"
            style={{ color: 'var(--muted)' }}
          >
            <XIcon size={22} />
          </button>
        </header>

        <nav className="flex flex-col gap-1">
          {ROUTES.map(route => {
            const RouteIcon = route.Icon;
            return (
              <NavLink
                key={route.to}
                to={route.to}
                end={route.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? '' : 'hover:bg-black/5'
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text)',
                })}
              >
                <RouteIcon size={18} />
                <span>{t(route.key)}</span>
              </NavLink>
            );
          })}
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
                  aria-label={LOCALE_LABELS[l]}
                  title={LOCALE_LABELS[l]}
                  className="inline-flex min-h-9 min-w-11 items-center justify-center rounded-full border px-3 py-1 text-lg leading-none transition-colors"
                  style={{
                    borderColor: selected ? 'var(--primary)' : 'var(--border)',
                    background: selected ? 'var(--primary)' : 'transparent',
                    color: selected ? '#fff' : 'var(--text)',
                  }}
                >
                  <span aria-hidden>{LOCALE_FLAGS[l]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
