import { useEffect, useId, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { Logo } from './Logo';

const STORAGE_KEY = 'mb_onboarded_v1';

function hasSeenOnboarding(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function OnboardingHint() {
  const { t } = useI18n();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<boolean>(() => !hasSeenOnboarding());

  const dismiss = () => {
    markSeen();
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center"
      role="presentation"
      style={{
        paddingInlineStart: 'max(env(safe-area-inset-left), 1rem)',
        paddingInlineEnd: 'max(env(safe-area-inset-right), 1rem)',
        paddingBlockStart: 'max(env(safe-area-inset-top), 1rem)',
        paddingBlockEnd: 'max(env(safe-area-inset-bottom), 1rem)',
      }}
    >
      <div className="absolute inset-0 bg-black/65" aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex w-full max-w-md flex-col gap-3 rounded-2xl shadow-2xl outline-none"
        style={{
          background: 'var(--surface)',
          color: 'var(--text)',
          padding: 'clamp(1rem, 3.2vw, 1.5rem)',
        }}
      >
        <h2
          id={titleId}
          className="inline-flex items-center gap-2 font-bold"
          style={{
            color: 'var(--primary)',
            fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
          }}
        >
          <Logo size={36} />
          {t('onboarding.title')
            .replace(/\s*🏸\s*/, '')
            .trim()}
        </h2>
        <ul
          className="space-y-2 text-sm leading-snug"
          style={{ color: 'var(--text)' }}
        >
          <Item icon="👆">{t('onboarding.tap')}</Item>
          <Item icon="🤚">{t('onboarding.hold')}</Item>
          <Item icon="⇄">{t('onboarding.swap')}</Item>
          <Item icon="↶">{t('onboarding.undo')}</Item>
        </ul>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-11 items-center rounded-xl px-5 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--primary)' }}
          >
            {t('onboarding.gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Item({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ background: 'var(--surface-highlight)' }}
      >
        {icon}
      </span>
      <span className="flex-1">{children}</span>
    </li>
  );
}
