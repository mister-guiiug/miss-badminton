import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/useI18n';
import { PageContainer } from '../components/layout/PageContainer';
import { MatchSetupWizard, type MatchConfig } from '../components/MatchSetupWizard';
import { useMatchStore } from '../../store/useMatchStore';
import { HistoryIcon, PlayIcon, PlusIcon, TrophyIcon } from '../components/icons';
import { Logo } from '../components/Logo';

export function HomeView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { match, setMatch, matchHistory } = useMatchStore();
  const [wizardOpen, setWizardOpen] = useState(false);

  const handleStartMatch = (config: MatchConfig) => {
    setMatch(config);
    setWizardOpen(false);
    navigate('/match');
  };

  const hasActiveMatch = !!match;
  const recentMatches = matchHistory.slice(0, 3);

  return (
    <PageContainer width="lg">
      <header className="flex flex-col items-center justify-center gap-4 py-8 text-center">
        <Logo size={80} />
        <h1
          className="text-4xl font-black tracking-tight"
          style={{ color: 'var(--primary)' }}
        >
          {t('appName')}
        </h1>
        <p className="max-w-md text-lg" style={{ color: 'var(--muted)' }}>
          {t('home.subtitleEmpty')}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="flex min-h-24 w-full items-center justify-center gap-4 rounded-3xl p-6 text-xl font-bold text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'var(--primary)' }}
          >
            <PlusIcon size={32} strokeWidth={3} />
            {t('home.newMatch')}
          </button>

          {hasActiveMatch && (
            <button
              type="button"
              onClick={() => navigate('/match')}
              className="flex min-h-24 w-full items-center justify-center gap-4 rounded-3xl border-2 p-6 text-xl font-bold shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{
                borderColor: 'var(--primary)',
                background: 'var(--surface)',
                color: 'var(--primary)',
              }}
            >
              <PlayIcon size={32} fill="currentColor" />
              {t('nav.match')}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/historique')}
            className="flex min-h-24 w-full items-center justify-center gap-4 rounded-3xl border p-6 text-xl font-bold shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--surface-highlight)',
              color: 'var(--text)',
            }}
          >
            <HistoryIcon size={32} />
            {t('home.viewHistory')}
          </button>
        </section>

        <section
          className="flex flex-col gap-4 rounded-3xl border p-6"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h2 className="flex items-center gap-2 text-lg font-bold uppercase tracking-wider opacity-60">
            <TrophyIcon size={20} />
            {t('historyExtra.statsTitle')}
          </h2>

          {recentMatches.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center opacity-40">
              <HistoryIcon size={48} className="mb-2" />
              <p>{t('history.empty')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-2xl border p-4"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-highlight)' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {m.config.team1.primary} vs {m.config.team2.primary}
                    </p>
                    <p className="text-xs opacity-60">
                      {new Date(m.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right font-black" style={{ color: 'var(--primary)' }}>
                    {m.finalSetWins.team1} – {m.finalSetWins.team2}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {wizardOpen && (
        <MatchSetupWizard
          onCancel={() => setWizardOpen(false)}
          onComplete={handleStartMatch}
        />
      )}
    </PageContainer>
  );
}
