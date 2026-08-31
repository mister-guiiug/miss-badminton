import { NavLink } from 'react-router-dom';
import { useI18n } from '../../../i18n';
import { Logo } from '../Logo';
import { HistoryIcon, HomeIcon, SettingsIcon } from '../icons';

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

/**
 * Sidebar permanente affichée sur `lg:` et plus — remplace le drawer ☰
 * sur les écrans larges (iPad paysage, desktop).
 */
export function PersistentSidebar() {
  const { t } = useI18n();
  return (
    <aside
      aria-label={t('nav.menuLabel')}
      className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col gap-2 border-r lg:flex"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
        paddingInlineStart: 'max(env(safe-area-inset-left), 0.75rem)',
        paddingInlineEnd: '0.75rem',
      }}
    >
      <div
        className="mb-2 inline-flex items-center gap-2 px-3 text-lg font-bold"
        style={{ color: 'var(--primary)' }}
      >
        <Logo size={32} />
        {t('appName')}
      </div>
      <nav className="flex flex-col gap-1">
        {ROUTES.map(route => {
          const RouteIcon = route.Icon;
          return (
            <NavLink
              key={route.to}
              to={route.to}
              end={route.end}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
    </aside>
  );
}
