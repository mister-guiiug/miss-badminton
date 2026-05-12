import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RiveScene } from '../components/RiveScene';
import {
  MatchSetupWizard,
  type MatchConfig,
  type Team,
} from '../components/MatchSetupWizard';
import { FullscreenPrompt } from '../components/FullscreenPrompt';

const RIVE_SRC = `${import.meta.env.BASE_URL}rive/shuttle.riv`;

function formatScore(value: number): string {
  return value.toString().padStart(2, '0');
}

function teamLabel(team: Team | undefined, fallback: string): string {
  if (!team) return fallback;
  if (team.partner) return `${team.primary} & ${team.partner}`;
  return team.primary;
}

export function HomeView() {
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [match, setMatch] = useState<MatchConfig | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const player1Label = teamLabel(match?.team1, 'joueur 1');
  const player2Label = teamLabel(match?.team2, 'joueur 2');

  const handlePanelClick = (which: 'p1' | 'p2') => {
    if (!match) {
      setWizardOpen(true);
      return;
    }
    if (which === 'p1') setScore1(s => s + 1);
    else setScore2(s => s + 1);
  };

  const handleComplete = (config: MatchConfig) => {
    setMatch(config);
    setScore1(0);
    setScore2(0);
    setWizardOpen(false);
  };

  const handleSwap = () => {
    if (!match) {
      setWizardOpen(true);
      return;
    }
    setMatch({ ...match, team1: match.team2, team2: match.team1 });
    setScore1(score2);
    setScore2(score1);
  };

  return (
    <>
      <FullscreenPrompt />
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section
          aria-label="Tableau de score"
          className="relative overflow-hidden rounded-2xl shadow-2xl"
          style={{ aspectRatio: '16 / 10', boxShadow: 'var(--shadow)' }}
        >
          <div className="absolute inset-0 grid grid-cols-2">
            <ScorePanel
              side="left"
              label={player1Label}
              score={score1}
              background="#e53935"
              textColor="#ffffff"
              onScore={() => handlePanelClick('p1')}
            />
            <ScorePanel
              side="right"
              label={player2Label}
              score={score2}
              background="#26a3b8"
              textColor="#ffffff"
              onScore={() => handlePanelClick('p2')}
            />
          </div>

          <div
            className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2"
            style={{
              top: '18%',
              width: 'min(22%, 140px)',
              aspectRatio: '1 / 1',
            }}
          >
            <RiveScene
              src={RIVE_SRC}
              ariaLabel="Volant de badminton animé"
              className="h-full w-full"
              fallback={<ShuttleFallback />}
            />
          </div>

          <button
            type="button"
            onClick={handleSwap}
            aria-label="Permuter les joueurs"
            className="absolute left-1/2 top-1/2 z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-lg font-bold shadow-lg ring-2 ring-black/10 transition-transform hover:scale-105 active:scale-95 sm:h-12 sm:w-12 sm:text-xl"
            style={{ background: '#ffffff', color: '#1f2937' }}
          >
            <span aria-hidden>⇄</span>
          </button>

          <footer className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-black/55 px-4 py-2 text-white backdrop-blur-sm">
            <span className="flex items-center gap-2 text-sm font-medium">
              <span aria-hidden>🏸</span>
              Badminton Scoreboard
            </span>
            <div className="flex items-center gap-3 text-base">
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                aria-label="Configurer le match"
                className="rounded-md px-2 py-1 hover:bg-white/10"
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => {
                  setScore1(0);
                  setScore2(0);
                }}
                aria-label="Remettre les scores à zéro"
                className="rounded-md px-2 py-1 hover:bg-white/10"
              >
                ↺
              </button>
              <Link
                to="/historique"
                aria-label="Voir l'historique"
                className="rounded-md px-2 py-1 hover:bg-white/10"
              >
                ☰
              </Link>
              <Link
                to="/parametres"
                aria-label="Ouvrir les paramètres"
                className="rounded-md px-2 py-1 hover:bg-white/10"
              >
                ⚙
              </Link>
            </div>
          </footer>
        </section>

        <div className="flex flex-col items-center gap-3 px-4 text-center">
          <h1
            className="text-2xl font-bold sm:text-3xl"
            style={{ color: 'var(--primary)' }}
          >
            Miss Badminton
          </h1>
          <p className="max-w-md text-sm" style={{ color: 'var(--muted)' }}>
            {match
              ? 'Touchez la zone rouge pour le joueur 1, la zone bleue pour le joueur 2.'
              : 'Touchez le tableau pour configurer un nouveau match.'}
          </p>
          <div className="flex w-full max-w-sm flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="flex-1 rounded-xl px-6 py-3 text-center font-semibold text-white"
              style={{ background: 'var(--primary)' }}
            >
              Nouveau match
            </button>
            <Link
              to="/historique"
              className="flex-1 rounded-xl px-6 py-3 text-center font-semibold"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              Voir l'historique
            </Link>
          </div>
        </div>

        {wizardOpen && (
          <MatchSetupWizard
            initial={match}
            onCancel={() => setWizardOpen(false)}
            onComplete={handleComplete}
          />
        )}
      </div>
    </>
  );
}

interface ScorePanelProps {
  side: 'left' | 'right';
  label: string;
  score: number;
  background: string;
  textColor: string;
  onScore: () => void;
}

function ScorePanel({
  side,
  label,
  score,
  background,
  textColor,
  onScore,
}: ScorePanelProps) {
  return (
    <button
      type="button"
      onClick={onScore}
      aria-label={`Ajouter un point pour ${label}`}
      className="relative flex h-full w-full flex-col justify-between px-4 pb-14 pt-4 text-left transition-[filter] duration-150 active:brightness-90 sm:px-6 sm:pb-16 sm:pt-6"
      style={{ background, color: textColor }}
    >
      <span
        className={`text-2xl font-light sm:text-3xl ${side === 'left' ? 'self-end' : 'self-start'}`}
        aria-hidden
      >
        0
      </span>
      <span
        className="self-center text-7xl font-light leading-none sm:text-9xl"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {formatScore(score)}
      </span>
      <span className="self-center text-sm font-medium opacity-90 sm:text-base">
        {label}
      </span>
    </button>
  );
}

function ShuttleFallback() {
  return (
    <div
      className="flex h-full w-full items-center justify-center text-5xl sm:text-6xl"
      style={{ animation: 'mb-shuttle-float 2.4s ease-in-out infinite' }}
      aria-hidden
    >
      🏸
    </div>
  );
}
