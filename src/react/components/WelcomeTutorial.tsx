import { useState } from 'react';
import { useI18n } from '../../i18n';
import { Modal } from './Modal';
import { Logo } from './Logo';

const DONE_KEY = 'mb_welcome_tutorial_done';

function isDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return true; // si localStorage indispo, on n'embête pas l'utilisateur
  }
}

function markDone(): void {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* ignore */
  }
}

/**
 * Mini-tutoriel séquencé au premier lancement.
 *
 * - 4 étapes max, skippables à tout moment
 * - Stocke `mb_welcome_tutorial_done` pour ne pas réapparaître
 * - Affiché par défaut sur la HomeView au premier render quand
 *   localStorage est vide (cas d'install PWA fresh)
 */
export function WelcomeTutorial() {
  const { t } = useI18n();
  const [open, setOpen] = useState(() => !isDone());
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);

  if (!open) return null;

  function close() {
    markDone();
    setOpen(false);
  }

  const slides: { title: string; body: string }[] = [
    {
      title: t('welcome.step1Title'),
      body: t('welcome.step1Body'),
    },
    {
      title: t('welcome.step2Title'),
      body: t('welcome.step2Body'),
    },
    {
      title: t('welcome.step3Title'),
      body: t('welcome.step3Body'),
    },
    {
      title: t('welcome.step4Title'),
      body: t('welcome.step4Body'),
    },
  ];
  const current = slides[step];
  const isLast = step === slides.length - 1;
  if (!current) return null;

  return (
    <Modal width="sm" ariaLabel={current.title} onClose={close}>
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo size={48} />
        <h2 className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
          {current.title}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text)' }}>
          {current.body}
        </p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5" aria-hidden>
          {slides.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-6 rounded-full transition-colors"
              style={{
                background: i <= step ? 'var(--primary)' : 'var(--border)',
              }}
            />
          ))}
        </div>

        <div className="mt-2 flex w-full justify-between gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--muted)',
            }}
          >
            {t('welcome.skip')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLast) close();
              else setStep(s => (s + 1) as 0 | 1 | 2 | 3);
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
            style={{ background: 'var(--primary)' }}
          >
            {isLast ? t('welcome.start') : t('welcome.next')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
