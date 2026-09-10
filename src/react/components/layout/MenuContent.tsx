import { useId } from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../../../i18n';
import { LOCALES, LOCALE_FLAGS, LOCALE_LABELS } from '../../../i18n/messages';
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
 *
 * IL NE PARLE PLUS DU RÉSEAU. Cette application n'a pas de serveur : les
 * matchs vivent dans le navigateur, et rien de ce qu'on y fait n'attend une
 * réponse. Un état « en ligne / hors ligne » n'y décrit donc AUCUNE
 * différence de comportement — c'était une ligne à lire pour apprendre qu'il
 * n'y avait rien à savoir.
 */
export function MenuContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t, locale, setLocale } = useI18n();
  // LE TIROIR ET LA BARRE COEXISTENT DANS LE DOCUMENT — la barre est masquée
  // par le CSS, pas retirée. Un `id` écrit en dur se retrouvait donc DEUX
  // fois, et l'`aria-labelledby` du tiroir désignait le libellé de la barre,
  // celui d'un élément caché. `useId` en donne un par instance.
  const langueId = useId();

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
                  avec le thème. Une pastille très légère et une puce d'icône
                  teintée disent la même chose, et laissent l'encre du texte
                  tranquille.
                */
                `flex min-h-12 items-center gap-3 rounded-2xl py-2 pl-2 pr-4 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]'
                    : 'hover:bg-[color-mix(in_srgb,var(--text)_7%,transparent)]'
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
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors"
                    style={{
                      background: isActive
                        ? 'color-mix(in srgb, var(--primary) 20%, transparent)'
                        : 'color-mix(in srgb, var(--text) 6%, transparent)',
                    }}
                  >
                    <ItemIcon size={18} />
                  </span>
                  <span>{t(item.key)}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <span
          id={langueId}
          className="px-1 text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--muted)' }}
        >
          {t('settings.languageLabel')}
        </span>

        {/*
          UN INTERRUPTEUR SEGMENTÉ, PLUS TROIS PASTILLES LIBRES. Les ronds
          bordés flottaient au ras du bord du tiroir : le premier avait son
          anneau COUPÉ par l'arête du panneau — un défaut que la marge seule
          ne corrigeait pas, puisque `pl-safe` remettait la marge gauche à zéro
          sur tout appareil sans encoche. Un rail unique, large comme la
          colonne, ne peut plus toucher le bord : c'est le conteneur qui porte
          la forme, et le choix courant n'est qu'un fond à l'intérieur.
        */}
        <div
          role="group"
          aria-labelledby={langueId}
          className="flex items-center gap-1 rounded-2xl p-1"
          style={{
            background: 'color-mix(in srgb, var(--text) 7%, transparent)',
          }}
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
                className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors"
                style={{
                  background: selected
                    ? 'color-mix(in srgb, var(--primary) 20%, transparent)'
                    : 'transparent',
                  color: selected ? 'var(--primary)' : 'var(--muted)',
                }}
              >
                <span aria-hidden className="text-base leading-none">
                  {LOCALE_FLAGS[l]}
                </span>
                <span aria-hidden>{l.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
