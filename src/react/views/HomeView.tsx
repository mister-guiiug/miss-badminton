import { useState } from 'react';
import { RiveScene } from '../components/RiveScene';
import {
  MatchSetupWizard,
  type MatchConfig,
  type Team,
} from '../components/MatchSetupWizard';
import { FullscreenPrompt } from '../components/FullscreenPrompt';
import { CourtOverlay, type ServiceSide } from '../components/CourtOverlay';
import { useI18n } from '../../i18n/useI18n';

const RIVE_SRC = `${import.meta.env.BASE_URL}rive/shuttle.riv`;

// Centre of the wide service court zone (between the doubles back service
// line and the short service line) expressed as a percentage of the full
// scoreboard width — used to align the score and player name.
const SCORE_INSET_PCT = 20.5;

// Centre of the narrow zone between the short service line and the net,
// expressed as a +/- offset from the section centre. Used to position the
// set score in a strip that's free of court markings.
const SET_OFFSET_PCT = 7.34;

const RED = '#e53935';
const BLUE = '#26a3b8';

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
            background={RED}
            textColor="#ffffff"
            onScore={() => handleScore('team1')}
            ariaLabel={t('scoreboard.addPoint', { name: player1Label })}
          />
          <ScorePanel
            background={BLUE}
            textColor="#ffffff"
            onScore={() => handleScore('team2')}
            ariaLabel={t('scoreboard.addPoint', { name: player2Label })}
          />
        </div>

        <CourtOverlay server={server} serverScore={serverScore} />

        {/* Numerals and labels rendered above the court overlay with a
            colour-matched aura so the white lines stay legible without
            crossing the digits. */}
        <ScoreDisplay side="left" score={score1} background={RED} />
        <ScoreDisplay side="right" score={score2} background={BLUE} />

        <SetScoreDisplay side="left" count={0} background={RED} />
        <SetScoreDisplay side="right" count={0} background={BLUE} />

        <LabelDisplay side="left" label={player1Label} background={RED} />
        <LabelDisplay side="right" label={player2Label} background={BLUE} />

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
  background: string;
  textColor: string;
  ariaLabel: string;
  onScore: () => void;
}

function ScorePanel({
  background,
  textColor,
  ariaLabel,
  onScore,
}: ScorePanelProps) {
  return (
    <button
      type="button"
      onClick={onScore}
      aria-label={ariaLabel}
      className="relative h-full w-full select-none text-left transition-[filter] duration-150 active:brightness-90"
      style={{ background, color: textColor, touchAction: 'manipulation' }}
    />
  );
}

interface ScoreDisplayProps {
  side: 'left' | 'right';
  score: number;
  background: string;
}

function ScoreDisplay({ side, score, background }: ScoreDisplayProps) {
  const aura = [
    `0 0 6px ${background}`,
    `0 0 14px ${background}`,
    `0 0 28px ${background}`,
    `0 0 56px ${background}`,
    '0 6px 22px rgba(0,0,0,0.32)',
  ].join(', ');

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-[5] select-none font-medium leading-none text-white"
      style={{
        top: '50%',
        [side === 'left' ? 'left' : 'right']: `${SCORE_INSET_PCT}%`,
        transform: `translate(${side === 'left' ? '-50%' : '50%'}, -50%)`,
        fontVariantNumeric: 'tabular-nums',
        fontSize: 'clamp(5rem, 22vw, 18rem)',
        letterSpacing: '-0.04em',
        textShadow: aura,
      }}
    >
      {formatScore(score)}
    </span>
  );
}

interface SetScoreDisplayProps {
  side: 'left' | 'right';
  count: number;
  background: string;
}

function SetScoreDisplay({ side, count, background }: SetScoreDisplayProps) {
  const aura = [
    `0 0 4px ${background}`,
    `0 0 10px ${background}`,
    `0 0 20px ${background}`,
    '0 2px 8px rgba(0,0,0,0.3)',
  ].join(', ');

  const leftPct = side === 'left' ? 50 - SET_OFFSET_PCT : 50 + SET_OFFSET_PCT;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-[5] select-none font-medium leading-none text-white"
      style={{
        top: '50%',
        left: `${leftPct}%`,
        transform: 'translate(-50%, -50%)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 'clamp(1.75rem, 5.5vw, 4.5rem)',
        textShadow: aura,
      }}
    >
      {count}
    </span>
  );
}

interface LabelDisplayProps {
  side: 'left' | 'right';
  label: string;
  background: string;
}

function LabelDisplay({ side, label, background }: LabelDisplayProps) {
  const aura = [
    `0 0 4px ${background}`,
    `0 0 12px ${background}`,
    `0 0 24px ${background}`,
    '0 2px 8px rgba(0,0,0,0.3)',
  ].join(', ');

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-[5] max-w-[42%] select-none truncate font-semibold text-white"
      style={{
        bottom: '11%',
        [side === 'left' ? 'left' : 'right']: `${SCORE_INSET_PCT}%`,
        transform: `translateX(${side === 'left' ? '-50%' : '50%'})`,
        fontSize: 'clamp(1.125rem, 3.6vw, 2.25rem)',
        textShadow: aura,
      }}
    >
      {label}
    </span>
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
