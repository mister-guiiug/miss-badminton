import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { PageContainer } from '../components/layout/PageContainer';
import { PwaInstallPrompt } from '@mister-guiiug/dev-pwa-config/react/pwa-install-prompt';
import { FamilyLinks } from '../components/FamilyLinks';
import { GESTES, trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import {
  MatchSetupWizard,
  type MatchConfig,
} from '../components/MatchSetupWizard';
import { useMatchStore } from '../../store/useMatchStore';
import { PlayIcon, PlusIcon } from '../components/icons';
import { Logo } from '../components/Logo';
import { WelcomeTutorial } from '../components/WelcomeTutorial';
import { readReplayFromUrl } from '../../share';
import { MatchConfigSchema, type MatchTemplate } from '../../schemas';
import { indexById, teamLabel } from '../../players';
import { storage } from '../../storage';
import { Trash2Icon } from '../components/icons';

export function HomeView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { match, setMatch, matchHistory, players } = useMatchStore();
  // Le registre des profils : un renommage doit se voir ici comme dans
  // l'historique, sans avoir touché aux matchs déjà joués.
  const byId = useMemo(() => indexById(players), [players]);
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

  /*
   * LE MATCH COMMENCE ICI — et `depuis` dit par quelle porte. L'assistant de
   * configuration et le modèle enregistré sont deux usages distincts : si
   * personne ne se sert des modèles, ils ne méritent pas l'écran qu'ils
   * occupent. Ni les noms des joueurs, ni les scores : les noms sont saisis.
   */
  const handleStartMatch = (config: MatchConfig) => {
    setMatch(config);
    trackEvent(GESTES.PARTIE, { etape: 'demarree', depuis: 'assistant' });
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
    trackEvent(GESTES.PARTIE, { etape: 'demarree', depuis: 'modele' });
    navigate('/match');
  };
  const handleDeleteTemplate = (id: string) => {
    storage.removeTemplate(id);
    setTemplates(storage.loadTemplates());
  };

  return (
    <PageContainer width="lg">
      {/*
        HUB COURT PRO — un viewport, une action. La marque porte l'écran ;
        l'historique vit dans la navigation, pas en second CTA géant.
      */}
      <header className="flex flex-col items-start gap-3 pt-2 pb-1 sm:items-center sm:pt-6 sm:text-center">
        <Logo size={80} className="size-14 sm:size-16" />
        <div className="flex flex-col gap-1.5">
          <h1
            className="text-[clamp(2rem,7vw,2.75rem)] font-extrabold tracking-tight"
            style={{ color: 'var(--text)' }}
          >
            {t('appName')}
          </h1>
          <p
            className="max-w-md text-sm sm:text-base"
            style={{ color: 'var(--muted)' }}
          >
            {t('home.subtitleEmpty')}
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="flex min-h-[3.5rem] w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-lg font-bold transition-transform hover:scale-[1.01] active:scale-[0.99] sm:min-h-16"
          style={{
            background: 'var(--cta)',
            color: 'var(--cta-ink)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <PlusIcon size={24} strokeWidth={3} />
          {t('home.newMatch')}
        </button>

        {hasActiveMatch && (
          <button
            type="button"
            onClick={() => navigate('/match')}
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border px-5 py-3 text-base font-semibold transition-colors"
            style={{
              borderColor: 'var(--primary)',
              background: 'var(--surface)',
              color: 'var(--primary)',
            }}
          >
            <PlayIcon size={20} fill="currentColor" />
            {t('nav.match')}
          </button>
        )}
      </section>

      {recentMatches.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="recent-title">
          <h2
            id="recent-title"
            className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--muted)' }}
          >
            {t('historyExtra.statsTitle')}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {recentMatches.map(m => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => navigate('/historique')}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {teamLabel(m.config.team1, t('players.player1'), byId)}
                      {' vs '}
                      {teamLabel(m.config.team2, t('players.player2'), byId)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {new Date(m.completedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div
                    className="shrink-0 font-mono text-sm font-bold tabular-nums"
                    style={{ color: 'var(--primary)' }}
                  >
                    {m.finalSetWins.team1}–{m.finalSetWins.team2}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {templates.length > 0 && (
        <section
          className="flex flex-col gap-2"
          aria-labelledby="templates-title"
        >
          <h2
            id="templates-title"
            className="text-[0.7rem] font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--muted)' }}
          >
            {t('home.templatesTitle')}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {templates.map(tpl => (
              <li key={tpl.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUseTemplate(tpl)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  <span className="truncate">{tpl.name}</span>
                  <span
                    className="shrink-0 text-xs font-medium"
                    style={{ color: 'var(--muted)' }}
                  >
                    {tpl.config.type === 'doubles' ? '2v2' : '1v1'} ·{' '}
                    {tpl.config.points} pts
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(tpl.id)}
                  aria-label={t('home.templatesDelete')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={{
                    color: 'var(--muted)',
                    borderColor: 'var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  <Trash2Icon size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {/* L'INVITE A QUITTÉ L'ÉCRAN DE MATCH pour l'accueil. Elle y paraissait
          au-dessus du tableau de score, en pleine partie — et le bandeau du
          socle, qui parle aussi aux iPhone, s'y montrerait bien plus souvent
          que l'ancien. Ici, le joueur est au repos.

          `dismissKey` reprend la clé du bandeau maison : le socle la lit comme
          un refus d'avant sa cadence et le traduit en report d'un mois, au lieu
          de reproposer l'installation à qui l'avait déjà écartée. */}
      <PwaInstallPrompt dismissKey="mb_pwa_install_dismissed" />

      {/* La règle famille veut ces trois liens sur le premier écran ET sur les
          Paramètres — deux écrans, nulle part ailleurs. */}
      <FamilyLinks />
    </PageContainer>
  );
}
