import { useRef } from 'react';
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
 */
export function NavDrawer({ onClose }: NavDrawerProps) {
  const { t } = useI18n();
  const drawerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(drawerRef, { restoreFocus: true });
  useScrollLock();
  useEscape(onClose);

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.menuLabel')}
        tabIndex={-1}
        className="menu-tiroir relative z-10 flex h-full w-80 max-w-[85vw] flex-col gap-4 p-5 pt-safe pb-safe pl-safe shadow-2xl outline-none"
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
            className="flex touch-target items-center justify-center rounded-md transition-colors hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)]"
            style={{ color: 'var(--muted)' }}
          >
            <XIcon size={22} />
          </button>
        </header>

        <MenuContent onNavigate={onClose} />
      </aside>
    </div>
  );
}
