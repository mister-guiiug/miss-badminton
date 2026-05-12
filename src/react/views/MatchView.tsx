import { useI18n } from '../../i18n/useI18n';

export function MatchView() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-16">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
        {t('nav.match')}
      </h1>
    </div>
  );
}
