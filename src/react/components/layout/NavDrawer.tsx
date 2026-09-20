import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  useEscape,
  useFocusTrap,
  useScrollLock,
} from '@mister-guiiug/dev-pwa-config/react/a11y';
import { useI18n } from '../../../i18n';
import { Logo } from '../Logo';
import { XIcon } from '../icons';
import { MenuContent } from './MenuContent';

interface NavDrawerProps {
  onClose: () => void;
}

/**
 * LE TIROIR, SUR LES ÉCRANS ÉTROITS.
 *
 * TROIS DÉFAUTS D'ACCESSIBILITÉ CORRIGÉS, tous invisibles à la souris :
 *
 *   - le focus SORTAIT du tiroir. Il recevait bien le focus à l'ouverture,
 *     mais rien ne le retenait : deux tabulations et l'on pilotait la page
 *     dessous, sans la voir, pendant qu'un voile noir la recouvrait ;
 *   - la page DÉFILAIT derrière le voile, au doigt comme à la molette ;
 *   - la touche Échap n'était écoutée que par une fenêtre, donc pas quand le
 *     focus se trouvait dans un champ.
 *
 * Les trois hooks du socle (`react/a11y`) font ce travail — ils existaient
 * déjà, cette app ne les avait simplement jamais pris.
 *
 * UN PANNEAU POSÉ, PLUS UNE DALLE COLLÉE AU BORD. Le tiroir occupait toute la
 * hauteur, angles vifs, à ras de l'écran — et son contenu touchait l'arête :
 * `p-5 … pl-safe` mettait la marge gauche à `env(safe-area-inset-left)`, donc
 * à ZÉRO sur tout appareil sans encoche, la classe la plus tardive gagnant
 * contre `p-5`. C'est ce qui coupait l'anneau de la première langue. Le
 * panneau flotte désormais dans une gouttière qui NE PEUT PAS disparaître —
 * `max(env(…), 0.5rem)` garde un plancher quand l'encoche vaut zéro — et le
 * même `max()` protège son rembourrage intérieur.
 */
export function NavDrawer({ onClose }: NavDrawerProps) {
  const { t } = useI18n();
  const drawerRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const precedent = useRef(pathname);

  useFocusTrap(drawerRef, { restoreFocus: true });
  useScrollLock();
  useEscape(onClose);

  /*
   * LE TIROIR SE FERME QUAND ON EST ARRIVÉ, PAS QUAND ON A CLIQUÉ.
   *
   * `MenuContent` appelait un `onNavigate` dès le clic. Or la vue visée n'est
   * pas encore là : son morceau de code est demandé à cet instant précis, et il
   * met un aller-retour réseau à venir — 118 ms mesurées le 20/09/2026 sur le
   * site publié, bien davantage à la première visite, quand la requête part au
   * milieu du reste du chargement. Le menu disparaissait donc sur une page
   * inchangée, et plus rien ne bougeait.
   *
   * `useLocation` ne change qu'une fois la transition VALIDÉE, c'est-à-dire une
   * fois la vue prête à peindre : c'est exactement le moment où refermer. Entre
   * les deux, le menu reste ouvert et l'entrée cliquée tourne.
   */
  useEffect(() => {
    if (precedent.current === pathname) return;
    precedent.current = pathname;
    onClose();
  }, [pathname, onClose]);

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      {/*
        Le cadre ne sert qu'à ménager la gouttière. Il laisse passer les clics
        (`pointer-events-none`) : sans cela il recouvrirait le voile sur toute
        la hauteur, et fermer le tiroir en touchant la page ne marcherait plus.
      */}
      <div
        className="pointer-events-none absolute inset-0 z-10 flex"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 0.5rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
          paddingInlineStart: 'max(env(safe-area-inset-left), 0.5rem)',
        }}
      >
        <aside
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.menuLabel')}
          tabIndex={-1}
          className="menu-tiroir pointer-events-auto flex h-full w-80 max-w-[86vw] flex-col gap-4 overflow-y-auto rounded-3xl p-5 shadow-2xl outline-none"
          style={{ background: 'var(--surface)', color: 'var(--text)' }}
        >
          <header className="flex items-center justify-between gap-2">
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
              className="flex touch-target shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[color-mix(in_srgb,var(--text)_10%,transparent)]"
              style={{ color: 'var(--muted)' }}
            >
              <XIcon size={20} />
            </button>
          </header>

          <MenuContent />
        </aside>
      </div>
    </div>
  );
}
