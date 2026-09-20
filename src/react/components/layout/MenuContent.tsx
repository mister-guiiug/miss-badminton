import { useId, useState, useTransition, type MouseEvent } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n';
import { LOCALES, LOCALE_FLAGS, LOCALE_LABELS } from '../../../i18n/messages';
import { NAV_ITEMS } from './nav-items';
import { RefreshCwIcon } from '../icons';

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
 *
 * IL NE FERME PLUS LE TIROIR NON PLUS. Il prenait un `onNavigate` qu'il
 * appelait au clic — donc AVANT que la vue soit là. Le menu s'escamotait, et
 * l'écran restait sur la page précédente sans que rien n'indique un travail en
 * cours. C'est désormais le tiroir qui se ferme, quand la route a réellement
 * changé : voir `NavDrawer`.
 */
export function MenuContent() {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [enCours, demarreLaTransition] = useTransition();
  const [ciblePendante, setCiblePendante] = useState<string | null>(null);

  /**
   * LA TRANSITION EST LA NÔTRE, et c'est tout l'intérêt.
   *
   * react-router 7 en ouvre déjà une de son côté — `startTransition(() =>
   * setStateImpl(newState))` dans son `BrowserRouter` — mais ne l'expose nulle
   * part hors d'un routeur de données. Conséquence mesurée le 20/09/2026 : le
   * repli de `Suspense` ne paraît JAMAIS sur un clic, puisque React 19 garde
   * l'écran déjà affiché pendant une transition. Le clic était donc muet.
   *
   * En pilotant `navigate` depuis ici, `enCours` reste vrai tant que le morceau
   * de la vue n'est pas arrivé : c'est la seule information qui manquait pour
   * répondre au visiteur.
   */
  const versLaVue = (e: MouseEvent<HTMLAnchorElement>, to: string) => {
    // On laisse le navigateur faire son travail quand le visiteur le lui
    // demande : nouvel onglet, nouvelle fenêtre, enregistrement de la cible.
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    e.preventDefault();
    setCiblePendante(to);
    demarreLaTransition(() => navigate(to));
  };

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
          const charge = enCours && ciblePendante === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={e => versLaVue(e, item.to)}
              aria-busy={charge || undefined}
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
                    {/* LA PASTILLE DE L'ENTRÉE CLIQUÉE TOURNE pendant que son
                        morceau arrive. C'est le seul retour visible : le repli
                        de `Suspense` ne paraîtra pas, React 19 gardant l'écran
                        courant le temps de la transition. */}
                    {charge ? (
                      <RefreshCwIcon size={18} className="animate-spin" />
                    ) : (
                      <ItemIcon size={18} />
                    )}
                  </span>
                  <span>{t(item.key)}</span>
                </>
              )}
            </NavLink>
          );
        })}

        {/* HORS DES LIENS, pour ne pas changer leur nom accessible en cours de
            route. Même forme que la zone vive de `MatchView`. */}
        <span className="sr-only" role="status" aria-live="polite">
          {enCours ? t('nav.loading') : ''}
        </span>
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
                /*
                  LES DEUX COULEURS SONT CONTRAINTES PAR LE CONTRASTE, pas par
                  le goût. Une première version teintait le choix courant
                  (`--primary` sur 20 % de `--primary`) et grisait les autres
                  (`--muted` sur le rail) : à 12 px, axe mesurait 4,06 et 4,13
                  pour 4,5 exigés en AA. Un fond PLEIN pour le courant et
                  l'encre normale pour les autres montent à 8,0 et 16,4 en
                  clair, 4,9 et 11,2 en sombre.
                */
                style={{
                  background: selected ? 'var(--surface)' : 'transparent',
                  boxShadow: selected
                    ? '0 1px 2px color-mix(in srgb, var(--text) 18%, transparent)'
                    : 'none',
                  color: selected ? 'var(--primary)' : 'var(--text)',
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
