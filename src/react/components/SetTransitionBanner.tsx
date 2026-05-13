import { useEffect } from 'react';
import { useI18n } from '../../i18n/useI18n';

interface SetTransitionBannerProps {
  winnerName: string;
  scoreA: number;
  scoreB: number;
  onClose: () => void;
}

const VISIBLE_MS = 2200;

export function SetTransitionBanner({
  winnerName,
  scoreA,
  scoreB,
  onClose,
}: SetTransitionBannerProps) {
  const { t } = useI18n();

  useEffect(() => {
    const timer = window.setTimeout(onClose, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      <div
        className="rounded-2xl px-6 py-4 text-center shadow-2xl"
        style={{
          background: 'rgba(0,0,0,0.78)',
          color: '#ffffff',
          animation: 'mb-set-pop 220ms ease-out',
        }}
      >
        <p className="text-xs uppercase tracking-wider opacity-80">🏸 Set</p>
        <p className="mt-1 text-lg font-bold">
          {t('setTransition.title', { name: winnerName })}
        </p>
        <p
          className="mt-1 text-2xl font-medium"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {t('setTransition.score', { a: scoreA, b: scoreB })}
        </p>
      </div>
    </div>
  );
}
