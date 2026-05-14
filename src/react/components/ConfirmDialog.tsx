import { useEffect, useId, useRef } from 'react';
import { useI18n } from '../../i18n/useI18n';

interface ConfirmDialogProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousActive = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previousActive?.focus?.();
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      role="presentation"
      style={{
        paddingInlineStart: 'max(env(safe-area-inset-left), 1rem)',
        paddingInlineEnd: 'max(env(safe-area-inset-right), 1rem)',
        paddingBlockStart: 'max(env(safe-area-inset-top), 1rem)',
        paddingBlockEnd: 'max(env(safe-area-inset-bottom), 1rem)',
      }}
    >
      <div
        className="absolute inset-0 bg-black/55"
        onClick={onCancel}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex w-full max-w-sm flex-col gap-4 rounded-2xl shadow-2xl outline-none"
        style={{
          background: 'var(--surface)',
          color: 'var(--text)',
          padding: 'clamp(1rem, 3.2vw, 1.5rem)',
        }}
      >
        <h2 id={titleId} className="text-lg font-bold">
          {title ?? t('confirm.title')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text)' }}>
          {message}
        </p>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-semibold"
            style={{
              background: 'var(--surface-highlight)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            {cancelLabel ?? t('confirm.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: danger ? 'var(--danger)' : 'var(--primary)' }}
          >
            {confirmLabel ?? t('confirm.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
