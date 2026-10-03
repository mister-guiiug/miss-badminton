import { useEffect, useState } from 'react';
import {
  currentAppUrl,
  shareOrCopy,
} from '@mister-guiiug/dev-pwa-config/share';
import { qrToDataUrl } from '@mister-guiiug/dev-pwa-config/qr';
import { useI18n } from '../../i18n';
import { Share2Icon } from './icons';

/**
 * Lien canonique de l'app + QR — remplace le bloc Données / Diagnostics.
 */
export function ShareAppSection() {
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const href =
      currentAppUrl() ||
      (typeof window !== 'undefined'
        ? window.location.origin + import.meta.env.BASE_URL
        : '');
    setUrl(href);
    if (!href) return;
    let cancelled = false;
    void qrToDataUrl(href, {
      width: 220,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(dataUrl => {
        if (!cancelled) setQr(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = async () => {
    if (!url) return;
    const result = await shareOrCopy({ url, title: t('appName') });
    if (result === 'cancelled') return;
    setFeedback(
      result === 'shared' || result === 'copied'
        ? t('settings.shareAppDone')
        : t('settings.shareAppFailed')
    );
  };

  const handleShare = async () => {
    if (!url) return;
    const result = await shareOrCopy({
      title: t('appName'),
      text: t('settings.shareAppText'),
      url,
    });
    if (result === 'cancelled') return;
    setFeedback(
      result === 'shared' || result === 'copied'
        ? t('settings.shareAppDone')
        : t('settings.shareAppFailed')
    );
  };

  return (
    <section
      className="space-y-3 rounded-2xl border"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        padding: 'clamp(0.75rem, 2.4vw, 1.25rem)',
      }}
    >
      <h2
        className="text-sm font-semibold uppercase tracking-wide"
        style={{ color: 'var(--muted)' }}
      >
        {t('settings.shareAppLabel')}
      </h2>
      <p className="text-sm" style={{ color: 'var(--text)' }}>
        {t('settings.shareAppHelp')}
      </p>

      <label className="flex flex-col gap-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--muted)' }}
        >
          {t('settings.shareAppLinkLabel')}
        </span>
        <input
          type="url"
          readOnly
          value={url}
          className="min-h-11 w-full rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface-highlight)',
            color: 'var(--text)',
          }}
        />
      </label>

      {qr && (
        <div className="flex justify-center py-2">
          <img
            src={qr}
            alt={t('settings.shareAppQrAlt')}
            width={220}
            height={220}
            className="rounded-xl border bg-white p-2"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface-highlight)',
            color: 'var(--text)',
          }}
        >
          {t('settings.shareAppCopy')}
        </button>
        <button
          type="button"
          onClick={() => void handleShare()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[var(--primary-ink)]"
          style={{ background: 'var(--primary)' }}
        >
          <Share2Icon size={16} />
          {t('settings.shareAppShare')}
        </button>
      </div>

      {feedback && (
        <p
          role="status"
          className="text-xs font-medium"
          style={{ color: 'var(--muted)' }}
        >
          {feedback}
        </p>
      )}
    </section>
  );
}
