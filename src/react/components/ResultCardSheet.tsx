import { useEffect, useState } from 'react';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { dateSlug } from '@mister-guiiug/dev-pwa-config/download';
import { useI18n } from '../../i18n';
import {
  renderResultCardPng,
  shareOrDownloadPng,
  type ResultCardInput,
} from '../../result-card';
import { DownloadIcon, Share2Icon } from './icons';

export type ResultCardPayload = Omit<
  ResultCardInput,
  'appName' | 'footer' | 'locale'
>;

interface ResultCardSheetProps {
  open: boolean;
  onClose: () => void;
  payload: ResultCardPayload | null;
}

export function ResultCardSheet({
  open,
  onClose,
  payload,
}: ResultCardSheetProps) {
  const { t, locale } = useI18n();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !payload) {
      setPreviewUrl(null);
      setBlob(null);
      setError(null);
      return;
    }
    let revoked: string | null = null;
    let cancelled = false;
    setBusy(true);
    setError(null);
    void renderResultCardPng({
      ...payload,
      appName: t('appName'),
      footer: t('resultCard.footer'),
      locale,
    })
      .then(b => {
        if (cancelled) return;
        const url = URL.createObjectURL(b);
        revoked = url;
        setBlob(b);
        setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(t('resultCard.error'));
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [open, payload, t, locale]);

  const filename = `miss-badminton-${dateSlug()}.png`;

  const handleShare = async () => {
    if (!blob) return;
    setBusy(true);
    try {
      await shareOrDownloadPng(blob, filename, t('resultCard.title'));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!blob) return;
    setBusy(true);
    try {
      const { downloadBlob } =
        await import('@mister-guiiug/dev-pwa-config/download');
      downloadBlob(blob, filename);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      title={t('resultCard.title')}
      closeLabel={t('resultCard.close')}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!blob || busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-40"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--surface-highlight)',
              color: 'var(--text)',
            }}
          >
            <DownloadIcon size={16} />
            {t('resultCard.save')}
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={!blob || busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[var(--primary-ink)] disabled:opacity-40"
            style={{ background: 'var(--primary)' }}
          >
            <Share2Icon size={16} />
            {t('resultCard.share')}
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3">
        {busy && !previewUrl && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {t('resultCard.rendering')}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="text-sm"
            style={{ color: 'var(--danger)' }}
          >
            {error}
          </p>
        )}
        {previewUrl && (
          <img
            src={previewUrl}
            alt={t('resultCard.previewAlt')}
            className="w-full max-w-sm rounded-xl border"
            style={{ borderColor: 'var(--border)' }}
          />
        )}
      </div>
    </Sheet>
  );
}
