import { NavLink } from 'react-router-dom';
import { useOnline } from '@mister-guiiug/dev-pwa-config/react/use-online';
import { useI18n } from '../../../i18n';
import { LOCALES, LOCALE_FLAGS, LOCALE_LABELS } from '../../../i18n/messages';
import { useOfflineReady } from '../../hooks/useOfflineReady';
import { NAV_ITEMS } from './nav-items';

/**
 * LE CORPS DU MENU, PARTAGÉ PAR LE TIROIR ET LA BARRE LATÉRALE.
 *
 * Avant, les deux menus n'offraient pas la même chose : le choix de la langue
 * n'existait que dans le tiroir mobile. Sur un iPad en paysage ou un écran de
 * bureau, la barre latérale remplace le tiroir — et le réglage disparaissait
 * avec lui. Un même écran doit offrir les mêmes choses à toutes les tailles.
 *
 * Ce composant ne décide de rien : ni de sa largeur, ni de sa position, ni de
 * son fond. Le tiroir le glisse par-dessus la page, la barre le pose à côté.
 */
export function MenuContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const online = useOnline();
  const offline = useOfflineReady();
  // Sans worker et avec le réseau, il n'y a rien à dire : c'est le cas du
  // développement, et une ligne « bientôt hors ligne » y serait fausse.
  const etat = !online
    ? 'now'
    : offline === 'ready'
      ? 'ready'
      : offline === 'preparing'
        ? 'preparing'
        : null;

  return (
    <>
      <nav aria-label={t('nav.menuLabel')} className="flex flex-col gap-1">
        {NAV_ITEMS.map(item => {
          const ItemIcon = item.Icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                /*
                  L'ACTIF SE MONTRE PAR UN REPÈRE, PAS PAR UN APLAT. Le pavé
                  plein de couleur primaire écrasait le reste du menu et
                  faisait passer le libellé en blanc sur un fond qui change
                  avec le thème. Une barre à gauche et un fond très léger
                  disent la même chose, et laissent l'encre du texte tranquille.
                */
                `relative flex min-h-11 items-center gap-3 rounded-lg py-2.5 pl-4 pr-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]'
                    : 'hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)]'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--primary)' : 'var(--text)',
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className="absolute inset-y-1.5 left-0 w-1 rounded-full transition-opacity"
                    style={{
                      background: 'var(--primary)',
                      opacity: isActive ? 1 : 0,
                    }}
                  />
                  <ItemIcon size={18} />
                  <span>{t(item.key)}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div
        className="mt-auto flex flex-col gap-3 border-t pt-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col gap-2">
          <span
            id="menu-langue"
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--muted)' }}
          >
            {t('settings.languageLabel')}
          </span>
          <div
            role="group"
            aria-labelledby="menu-langue"
            className="flex flex-wrap gap-2"
          >
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
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border text-lg leading-none transition-colors"
                  style={{
                    borderColor: selected ? 'var(--primary)' : 'var(--border)',
                    background: selected
                      ? 'color-mix(in srgb, var(--primary) 16%, transparent)'
                      : 'transparent',
                    color: 'var(--text)',
                  }}
                >
                  <span aria-hidden>{LOCALE_FLAGS[l]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/*
          CE QUE LE MENU DIT DU RÉSEAU. L'application n'a pas de serveur : elle
          marche sans connexion, et personne ne le savait — la seule mention
          était une pastille noire qui n'apparaît QUE hors ligne, une fois le
          mal fait. Ici l'état est permanent, et il ne promet le hors-ligne que
          lorsqu'un service worker contrôle vraiment la page.
        */}
        {etat ? (
          <p
            className="m-0 flex items-start gap-2 text-xs leading-snug"
            style={{ color: 'var(--muted)' }}
          >
            <span
              aria-hidden
              className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
              style={{
                background:
                  etat === 'ready' ? 'var(--primary)' : 'var(--muted)',
              }}
            />
            <span>{t(`offline.${etat}`)}</span>
          </p>
        ) : null}
      </div>
    </>
  );
}
