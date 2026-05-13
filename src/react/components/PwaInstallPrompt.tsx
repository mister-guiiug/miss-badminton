import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'mb_pwa_install_dismissed';

export function PwaInstallPrompt() {
  const { t } = useI18n();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY) === '1') return;
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    const installed = () => setVisible(false);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const onInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setVisible(false);
  };

  const onDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible || !deferred) return null;

  return (
    <div
      role="dialog"
      aria-label={t('pwa.installPrompt')}
      className="pointer-events-none fixed inset-x-0 bottom-3 z-[55] flex justify-center px-3"
    >
      <div
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border p-3 shadow-lg"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      >
        <span aria-hidden className="text-xl">
          📲
        </span>
        <span className="flex-1 text-sm">{t('pwa.installPrompt')}</span>
        <button
          type="button"
          onClick={onInstall}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
          style={{ background: 'var(--primary)' }}
        >
          {t('pwa.install')}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('pwa.dismiss')}
          className="px-1 text-xl leading-none"
          style={{ color: 'var(--muted)' }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
