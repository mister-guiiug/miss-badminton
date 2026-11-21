import type { ReactNode } from 'react';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';

/** Une ligne à choisir : un match de l'historique, ou un match eBad. */
export interface EbadLinkCandidate {
  id: string;
  primary: string;
  secondary: string;
  /** Mis en avant comme « suggéré » (`LinkAssessment.likely`). */
  likely: boolean;
  /** C'est la liaison actuelle. */
  current: boolean;
}

interface EbadLinkSheetProps {
  title: string;
  closeLabel: string;
  suggestedLabel: string;
  emptyText: string;
  candidates: EbadLinkCandidate[];
  onPick: (id: string) => void;
  onClose: () => void;
  /** Actions du pied : « Dissocier », « Gérer les matchs eBad »… */
  footer?: ReactNode;
}

/**
 * LA FEUILLE D'ASSOCIATION, la même dans les deux sens.
 *
 * Depuis la page eBad, on choisit le match scoré d'un match eBad ; depuis
 * l'historique, le match eBad d'un match scoré. La liste arrive déjà triée
 * du plus probable au moins probable (`suggestSavedMatches`,
 * `suggestEbadMatches`) : cette feuille ne décide de rien, elle montre et
 * rend le choix. Rien n'est lié sans un toucher.
 */
export function EbadLinkSheet({
  title,
  closeLabel,
  suggestedLabel,
  emptyText,
  candidates,
  onPick,
  onClose,
  footer,
}: EbadLinkSheetProps) {
  return (
    <Sheet
      open
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      footer={
        <>
          {footer}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            {closeLabel}
          </button>
        </>
      }
    >
      {candidates.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {emptyText}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {candidates.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c.id)}
                aria-current={c.current ? 'true' : undefined}
                className="flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]"
                style={{
                  borderColor: c.current ? 'var(--primary)' : 'var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {c.primary}
                  </span>
                  <span
                    className="block truncate text-xs"
                    style={{ color: 'var(--muted)' }}
                  >
                    {c.secondary}
                  </span>
                </span>
                {c.likely && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider"
                    style={{
                      background:
                        'color-mix(in srgb, var(--primary) 14%, transparent)',
                      color: 'var(--primary)',
                    }}
                  >
                    {suggestedLabel}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
