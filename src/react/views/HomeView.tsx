import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/useI18n';
import { PageContainer } from '../components/layout/PageContainer';
import {
  MatchSetupWizard,
  type MatchConfig,
} from '../components/MatchSetupWizard';
import { useMatchStore } from '../../store/useMatchStore';
import {
  HistoryIcon,
  PlayIcon,
  PlusIcon,
  TrophyIcon,
} from '../components/icons';
import { Logo } from '../components/Logo';
import { WelcomeTutorial } from '../components/WelcomeTutorial';
import { readReplayFromUrl } from '../../share';
import { MatchConfigSchema, type MatchTemplate } from '../../schemas';
import { storage } from '../../storage';
import { Trash2Icon } from '../components/icons';

export function HomeView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { match, setMatch, matchHistory } = useMatchStore();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [replayInitial, setReplayInitial] = useState<MatchConfig | null>(null);

  // Au boot, si l'URL contient `?replay=<base64>`, on ouvre le wizard
  // pré-rempli avec la config du lien. La query string est consommée pour
  // éviter de ré-ouvrir le wizard à chaque navigation.
  useEffect(() => {
    const raw = readReplayFromUrl();
    if (!raw) return;
    const result = MatchConfigSchema.safeParse(raw);
    if (!result.success) return;
    setReplayInitial(result.data as MatchConfig);
    setWizardOpen(true);
    // Nettoie la query sans recharger.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('replay');
      window.history.replaceState(null, '', url.toString());
    } catch {
      /* ignore */
    }
  }, []);

  const handleStartMatch = (config: MatchConfig) => {
    setMatch(config);
    setWizardOpen(false);
    navigate('/match');
  };

  const hasActiveMatch = !!match;
  const recentMatches = matchHistory.slice(0, 3);
  const [templates, setTemplates] = useState<MatchTemplate[]>(() =>
    storage.loadTemplates()
  );

  const handleUseTemplate = (template: MatchTemplate) => {
    setMatch(template.config);
    navigate('/match');
  };
  const handleDeleteTemplate = (id: string) => {
    storage.removeTemplate(id);
    setTemplates(storage.loadTemplates());
  };

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

          {templates.length > 0 && (
            <div
              className="flex flex-col gap-2 rounded-3xl border p-4"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
              aria-labelledby="templates-title"
            >
              <h3
                id="templates-title"
                className="text-xs font-bold uppercase tracking-widest opacity-60"
              >
                {t('home.templatesTitle')}
              </h3>
              <ul className="flex flex-col gap-1">
                {templates.map(tpl => (
                  <li key={tpl.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUseTemplate(tpl)}
                      className="flex flex-1 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-black/[0.03]"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--surface-highlight)',
                      }}
                    >
                      <span className="truncate">{tpl.name}</span>
                      <span className="text-xs font-medium opacity-50">
                        {tpl.config.type === 'doubles' ? '2v2' : '1v1'} ·{' '}
                        {tpl.config.points} pts
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      aria-label={t('home.templatesDelete')}
                      className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/5"
                      style={{ color: 'var(--muted)' }}
                    >
                      <Trash2Icon size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
              {recentMatches.map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-2xl border p-4"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface-highlight)',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {m.config.team1.primary} vs {m.config.team2.primary}
                    </p>
                    <p className="text-xs opacity-60">
                      {new Date(m.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div
                    className="text-right font-black"
                    style={{ color: 'var(--primary)' }}
                  >
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
          initial={replayInitial}
          onCancel={() => {
            setWizardOpen(false);
            setReplayInitial(null);
          }}
          onComplete={config => {
            setReplayInitial(null);
            handleStartMatch(config);
          }}
        />
      )}

      <WelcomeTutorial />
    </PageContainer>
  );
}
