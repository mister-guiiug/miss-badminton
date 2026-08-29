import { useI18n } from '../../i18n/useI18n';
import { useOnline } from '@mister-guiiug/dev-wpa-config/react/use-online';

export function OfflineIndicator() {
  const { t } = useI18n();
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-safe-3 z-[65] flex justify-center px-3"
    >
      <div
        className="pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-lg backdrop-blur-md"
        style={{
          background: 'rgba(0,0,0,0.7)',
          borderColor: 'rgba(255,255,255,0.18)',
          color: '#fff',
        }}
      >
        <span aria-hidden>●</span>
        <span>{t('offline.banner')}</span>
      </div>
    </div>
  );
}
