/**
 * Le bandeau « supprimé · Annuler ».
 *
 * POURQUOI PAS LE `toast` DU SOCLE. Il empile des messages et les efface tout
 * seul, mais il ne porte AUCUNE action et ne prévient personne à l'expiration.
 * Or c'est exactement ce dont dépend une suppression annulable : quelqu'un
 * doit écrire au moment où le délai a filé. Le minuteur vit donc dans le
 * magasin (`UNDO_DELETE_MS`), et ce composant n'est que la partie visible —
 * il ne décide de rien, il affiche et il rend le clic.
 *
 * Une région `status` : le bandeau apparaît APRÈS coup, et sans `aria-live`
 * un lecteur d'écran ne verrait jamais passer ni la suppression ni le fait
 * qu'elle est rattrapable.
 */
interface UndoToastProps {
  message: string;
  actionLabel: string;
  onUndo: () => void;
}

export function UndoToast({ message, actionLabel, onUndo }: UndoToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-safe-3 z-[66] flex justify-center px-3"
    >
      <div
        className="flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold shadow-lg backdrop-blur-md"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      >
        <span>{message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="inline-flex min-h-9 items-center rounded-full px-3 py-1 text-sm font-bold underline underline-offset-2"
          style={{ color: 'var(--primary)' }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
