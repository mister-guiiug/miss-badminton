import { useI18n } from '../../i18n/useI18n';
import { PageContainer } from '../components/layout/PageContainer';

export function MatchView() {
  const { t } = useI18n();
  return (
    <PageContainer width="md">
      <h1
        className="font-bold"
        style={{
          color: 'var(--primary)',
          fontSize: 'clamp(1.5rem, 4.5vw, 2.25rem)',
        }}
      >
        {t('nav.match')}
      </h1>
    </PageContainer>
  );
}
