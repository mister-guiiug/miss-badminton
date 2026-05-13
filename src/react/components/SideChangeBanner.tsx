import { useI18n } from '../../i18n/useI18n';

interface SideChangeBannerProps {
  onSwap: () => void;
  onDismiss: () => void;
}

export function SideChangeBanner({ onSwap, onDismiss }: SideChangeBannerProps) {
  const { t } = useI18n();
  return (
    <div
      role="dialog"
      aria-label={t('sideChange.title')}
      className="absolute inset-x-3 top-3 z-30 flex items-center gap-3 rounded-xl border p-3 shadow-lg backdrop-blur-md"
      style={{
        background: 'rgba(0,0,0,0.78)',
        borderColor: 'rgba(255,255,255,0.18)',
        color: '#ffffff',
      }}
    >
      <span aria-hidden className="text-xl">
        🔄
      </span>
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-semibold">{t('sideChange.title')}</span>
        <span className="text-xs opacity-80">{t('sideChange.body')}</span>
      </div>
      <button
        type="button"
        onClick={onSwap}
        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
        style={{ background: 'var(--primary)' }}
      >
        {t('sideChange.swapNow')}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('sideChange.later')}
        className="rounded-md px-2 py-1 text-base leading-none hover:bg-white/10"
      >
        ×
      </button>
    </div>
  );
}
