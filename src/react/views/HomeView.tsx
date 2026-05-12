import { useState } from 'react';
import { RiveScene } from '../components/RiveScene';
import {
  MatchSetupWizard,
  type MatchConfig,
  type Team,
} from '../components/MatchSetupWizard';
import { FullscreenPrompt } from '../components/FullscreenPrompt';
import { CourtOverlay, type ServiceSide } from '../components/CourtOverlay';
import { useLongPress } from '../hooks/useLongPress';
import { useI18n } from '../../i18n/useI18n';

const RIVE_SRC = `${import.meta.env.BASE_URL}rive/shuttle.riv`;
const LONG_PRESS_MS = 320;

function formatScore(value: number): string {
  return value.toString().padStart(2, '0');
}

function resolveTeamLabel(team: Team, fallbacks: [string, string?]): string {
  const primary = team.primary || fallbacks[0];
  if (team.partner !== undefined) {
    const partner = team.partner || fallbacks[1] || '';
    return partner ? `${primary} & ${partner}` : primary;
  }
  return primary;
}

export function HomeView() {
  const { t } = useI18n();

  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [match, setMatch] = useState<MatchConfig | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [server, setServer] = useState<ServiceSide | null>(null);

  const player1Label = match
    ? resolveTeamLabel(match.team1, [
        t('players.player1'),
        t('players.partner1'),
      ])
    : t('players.player1');
  const player2Label = match
    ? resolveTeamLabel(match.team2, [
        t('players.player2'),
        t('players.partner2'),
      ])
    : t('players.player2');

  const handleScore = (which: ServiceSide) => {
    if (!match) {
      setWizardOpen(true);
      return;
    }
    if (which === 'team1') setScore1(s => s + 1);
    else setScore2(s => s + 1);
    setServer(which);
  };

  const handleComplete = (config: MatchConfig) => {
    setMatch(config);
    setScore1(0);
    setScore2(0);
    setServer(null);
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
    setServer(prev =>
      prev === 'team1' ? 'team2' : prev === 'team2' ? 'team1' : null
    );
  };

  const handleReset = () => {
    setScore1(0);
    setScore2(0);
    setServer(null);
  };

  const serverScore = server === 'team1' ? score1 : score2;

  return (
    <>
      <FullscreenPrompt />
      <section
        aria-label={t('home.scoreboardLabel')}
        className="relative w-full overflow-hidden shadow-2xl"
        style={{ aspectRatio: '16 / 10', boxShadow: 'var(--shadow)' }}
      >
        <div className="absolute inset-0 grid grid-cols-2">
          <ScorePanel
            side="left"
            label={player1Label}
            score={score1}
            background="#e53935"
            textColor="#ffffff"
            onScore={() => handleScore('team1')}
            ariaLabel={t('scoreboard.addPoint', { name: player1Label })}
            holdHint={t('scoreboard.holdHint')}
          />
          <ScorePanel
            side="right"
            label={player2Label}
            score={score2}
            background="#26a3b8"
            textColor="#ffffff"
            onScore={() => handleScore('team2')}
            ariaLabel={t('scoreboard.addPoint', { name: player2Label })}
            holdHint={t('scoreboard.holdHint')}
          />
        </div>

        <CourtOverlay server={server} serverScore={serverScore} />

        <div
          className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2"
          style={{
            top: '12%',
            width: 'min(18%, 110px)',
            aspectRatio: '1 / 1',
          }}
        >
          <RiveScene
            src={RIVE_SRC}
            ariaLabel={t('home.scoreboardLabel')}
            className="h-full w-full"
            fallback={<ShuttleFallback />}
          />
        </div>

        <button
          type="button"
          onClick={handleSwap}
          aria-label={t('scoreboard.swap')}
          className="absolute left-1/2 top-1/2 z-20 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xl font-bold shadow-lg ring-2 ring-black/10 transition-transform hover:scale-105 active:scale-95 sm:h-14 sm:w-14 sm:text-2xl"
          style={{ background: '#ffffff', color: '#1f2937' }}
        >
          <span aria-hidden>⇄</span>
        </button>

        <footer className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between bg-black/55 px-4 py-2 text-white backdrop-blur-sm">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span aria-hidden>🏸</span>
            {t('scoreboard.title')}
          </span>
          <div className="flex items-center gap-3 text-base">
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              aria-label={t('scoreboard.edit')}
              className="rounded-md px-2 py-1 hover:bg-white/10"
            >
              <span aria-hidden>✎</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              aria-label={t('scoreboard.reset')}
              className="rounded-md px-2 py-1 hover:bg-white/10"
            >
              <span aria-hidden>↺</span>
            </button>
          </div>
        </footer>
      </section>

      {wizardOpen && (
        <MatchSetupWizard
          initial={match}
          onCancel={() => setWizardOpen(false)}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}

interface ScorePanelProps {
  side: 'left' | 'right';
  label: string;
  score: number;
  background: string;
  textColor: string;
  ariaLabel: string;
  holdHint: string;
  onScore: () => void;
}

function ScorePanel({
  side,
  label,
  score,
  background,
  textColor,
  ariaLabel,
  holdHint,
  onScore,
}: ScorePanelProps) {
  const { isPressing, handlers } = useLongPress(onScore, LONG_PRESS_MS);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="relative flex h-full w-full select-none flex-col justify-between px-4 pb-12 pt-4 text-left transition-[filter] duration-150 active:brightness-90 sm:px-6 sm:pb-14 sm:pt-6"
      style={{ background, color: textColor, touchAction: 'manipulation' }}
      {...handlers}
    >
      <span
        className={`text-xl font-light opacity-80 sm:text-2xl ${
          side === 'left' ? 'self-end' : 'self-start'
        }`}
        aria-hidden
      >
        0
      </span>
      <span
        className="self-center text-center font-medium leading-none"
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontSize: 'clamp(5rem, 22vw, 18rem)',
          textShadow: '0 6px 24px rgba(0,0,0,0.28)',
          letterSpacing: '-0.04em',
        }}
      >
        {formatScore(score)}
      </span>
      <span className="self-center text-sm font-medium opacity-95 sm:text-base">
        {label}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-9 select-none text-center text-[10px] uppercase tracking-wider opacity-55 sm:text-xs"
      >
        {holdHint}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-9 z-10 h-1 origin-left bg-white/80"
        style={{
          transform: `scaleX(${isPressing ? 1 : 0})`,
          transition: isPressing
            ? `transform ${LONG_PRESS_MS}ms linear`
            : 'transform 120ms ease-out',
        }}
      />
    </button>
  );
}

function ShuttleFallback() {
  return (
    <div
      className="flex h-full w-full items-center justify-center text-4xl sm:text-5xl"
      style={{ animation: 'mb-shuttle-float 2.4s ease-in-out infinite' }}
      aria-hidden
    >
      🏸
    </div>
  );
}
