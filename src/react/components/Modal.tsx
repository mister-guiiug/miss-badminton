import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  ariaLabel?: string;
  ariaLabelledBy?: string;
  /** Largeur max ; valeurs Tailwind sm / md / lg. */
  width?: 'sm' | 'md' | 'lg';
  /** Si true, ESC ferme et un clic backdrop ferme. Défaut : true. */
  dismissible?: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Modal accessible réutilisable.
 *
 * Fournit :
 *  - dialog + aria-modal
 *  - focus management : auto-focus du premier élément focusable à l'ouverture,
 *    focus trap dans le modal, restauration du focus précédent à la fermeture
 *  - ESC pour fermer (sauf dismissible=false)
 *  - Clic backdrop pour fermer (sauf dismissible=false)
 */
export function Modal({
  ariaLabel,
  ariaLabelledBy,
  width = 'md',
  dismissible = true,
  onClose,
  children,
}: ModalProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousActive = document.activeElement as HTMLElement | null;
    // Focus auto sur le premier élément focusable, sinon sur la div modale.
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables?.[0];
    if (first) first.focus();
    else dialogRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation();
        onClose();
        return;
      }
      // Focus trap : Tab et Shift+Tab bouclent dans les focusables.
      if (e.key === 'Tab' && focusables && focusables.length > 0) {
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previousActive?.focus?.();
    };
  }, [onClose, dismissible]);

  const widthClass =
    width === 'sm' ? 'max-w-sm' : width === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/55"
        onClick={dismissible ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        id={id}
        className={`relative z-10 w-full ${widthClass} rounded-2xl p-5 shadow-2xl outline-none`}
        style={{ background: 'var(--surface)', color: 'var(--text)' }}
      >
        {children}
      </div>
    </div>
  );
}
