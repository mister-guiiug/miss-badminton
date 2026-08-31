import { useEffect } from 'react';
import { useI18n } from '../../i18n';

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
        className="max-w-[90%] rounded-2xl text-center shadow-2xl"
        style={{
          background: 'rgba(0,0,0,0.78)',
          color: '#ffffff',
          animation: 'mb-set-pop 220ms ease-out',
          padding: 'clamp(0.75rem, 2.4vw, 1.25rem) clamp(1rem, 3.5vw, 1.75rem)',
        }}
      >
        <p
          className="uppercase tracking-wider opacity-80"
          style={{ fontSize: 'clamp(0.65rem, 1.6vw, 0.8rem)' }}
        >
          🏸 Set
        </p>
        <p
          className="mt-1 font-bold"
          style={{ fontSize: 'clamp(1rem, 3vw, 1.5rem)' }}
        >
          {t('setTransition.title', { name: winnerName })}
        </p>
        <p
          className="mt-1 font-medium"
          style={{
            fontVariantNumeric: 'tabular-nums',
            fontSize: 'clamp(1.25rem, 4.5vw, 2rem)',
          }}
        >
          {t('setTransition.score', { a: scoreA, b: scoreB })}
        </p>
      </div>
    </div>
  );
}
