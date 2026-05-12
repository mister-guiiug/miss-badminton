import { useReducer, useState } from 'react';
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

interface SetWins {
  team1: number;
  team2: number;
}

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

function setsNeededToWin(totalSets: number): number {
  return Math.floor(totalSets / 2) + 1;
}

function isSetWon(scoreA: number, scoreB: number, target: number): boolean {
  return scoreA >= target && scoreA - scoreB >= 2;
}

interface GameState {
  score1: number;
  score2: number;
  setWins: SetWins;
  matchWinner: ServiceSide | null;
  server: ServiceSide | null;
}

const INITIAL_GAME_STATE: GameState = {
  score1: 0,
  score2: 0,
  setWins: { team1: 0, team2: 0 },
  matchWinner: null,
  server: null,
};

type GameAction =
  | { type: 'score'; team: ServiceSide; target: number; setsToWin: number }
  | { type: 'swap' }
  | { type: 'reset' }
  | { type: 'restart' };

function flipSide(side: ServiceSide | null): ServiceSide | null {
  if (side === 'team1') return 'team2';
  if (side === 'team2') return 'team1';
  return null;
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'score': {
      if (state.matchWinner) return state;
      const nextS1 = action.team === 'team1' ? state.score1 + 1 : state.score1;
      const nextS2 = action.team === 'team2' ? state.score2 + 1 : state.score2;
      const team1Won = isSetWon(nextS1, nextS2, action.target);
      const team2Won = isSetWon(nextS2, nextS1, action.target);
      if (team1Won || team2Won) {
        const winnerSide: ServiceSide = team1Won ? 'team1' : 'team2';
        const nextSetWins: SetWins = {
          team1: state.setWins.team1 + (team1Won ? 1 : 0),
          team2: state.setWins.team2 + (team2Won ? 1 : 0),
        };
        const matchEnded = nextSetWins[winnerSide] >= action.setsToWin;
        return {
          score1: 0,
          score2: 0,
          server: null,
          setWins: nextSetWins,
          matchWinner: matchEnded ? winnerSide : null,
        };
      }
      return {
        ...state,
        score1: nextS1,
        score2: nextS2,
        server: action.team,
      };
    }
    case 'swap':
      return {
        score1: state.score2,
        score2: state.score1,
        setWins: { team1: state.setWins.team2, team2: state.setWins.team1 },
        matchWinner: flipSide(state.matchWinner),
        server: flipSide(state.server),
      };
    case 'reset':
      return {
        ...state,
        score1: 0,
        score2: 0,
        setWins: { team1: 0, team2: 0 },
        matchWinner: null,
        server: null,
      };
    case 'restart':
      return INITIAL_GAME_STATE;
  }
}

export function HomeView() {
  const { t } = useI18n();

  const [game, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const { score1, score2, setWins, matchWinner, server } = game;
  const [match, setMatch] = useState<MatchConfig | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [team1Inverted, setTeam1Inverted] = useState(false);
  const [team2Inverted, setTeam2Inverted] = useState(false);

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

  const isDoubles = match?.type === 'doubles';

  function teamPair(
    team: Team | undefined,
    inverted: boolean,
    fallbacks: [string, string]
  ): { top: string; bottom: string } {
    if (!team || !team.partner) {
      return { top: '', bottom: team?.primary || fallbacks[0] };
    }
    const primary = team.primary || fallbacks[0];
    const partner = team.partner || fallbacks[1];
    return inverted
      ? { top: primary, bottom: partner }
      : { top: partner, bottom: primary };
  }

  const team1Pair = teamPair(match?.team1, team1Inverted, [
    t('players.player1'),
    t('players.partner1'),
  ]);
  const team2Pair = teamPair(match?.team2, team2Inverted, [
    t('players.player2'),
    t('players.partner2'),
  ]);

  const handleScore = (which: ServiceSide) => {
    if (!match) {
      setWizardOpen(true);
      return;
    }
    dispatch({
      type: 'score',
      team: which,
      target: match.points,
      setsToWin: setsNeededToWin(match.sets),
    });
  };

  const handleComplete = (config: MatchConfig) => {
    setMatch(config);
    dispatch({ type: 'restart' });
    setTeam1Inverted(false);
    setTeam2Inverted(false);
    setWizardOpen(false);
  };

  const handleSwap = () => {
    if (!match) {
      setWizardOpen(true);
      return;
    }
    setMatch({ ...match, team1: match.team2, team2: match.team1 });
    const prevT1 = team1Inverted;
    setTeam1Inverted(team2Inverted);
    setTeam2Inverted(prevT1);
    dispatch({ type: 'swap' });
  };

  const handleReset = () => {
    dispatch({ type: 'reset' });
  };

  const serverScore = server === 'team1' ? score1 : score2;
  const winnerLabel =
    matchWinner === 'team1'
      ? player1Label
      : matchWinner === 'team2'
        ? player2Label
        : '';

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

        <ScoreDisplay side="left" score={score1} background={RED} />
        <ScoreDisplay side="right" score={score2} background={BLUE} />

        <SetScoreDisplay side="left" count={setWins.team1} background={RED} />
        <SetScoreDisplay side="right" count={setWins.team2} background={BLUE} />

        {isDoubles ? (
          <>
            <LabelDisplay
              side="left"
              position="top"
              label={team1Pair.top}
              background={RED}
              onSwap={() => setTeam1Inverted(s => !s)}
              swapLabel={t('scoreboardExtra.invertPlayers')}
            />
            <LabelDisplay
              side="left"
              position="bottom"
              label={team1Pair.bottom}
              background={RED}
              onSwap={() => setTeam1Inverted(s => !s)}
              swapLabel={t('scoreboardExtra.invertPlayers')}
            />
            <LabelDisplay
              side="right"
              position="top"
              label={team2Pair.top}
              background={BLUE}
              onSwap={() => setTeam2Inverted(s => !s)}
              swapLabel={t('scoreboardExtra.invertPlayers')}
            />
            <LabelDisplay
              side="right"
              position="bottom"
              label={team2Pair.bottom}
              background={BLUE}
              onSwap={() => setTeam2Inverted(s => !s)}
              swapLabel={t('scoreboardExtra.invertPlayers')}
            />
          </>
        ) : (
          <>
            <LabelDisplay
              side="left"
              position="bottom"
              label={player1Label}
              background={RED}
            />
            <LabelDisplay
              side="right"
              position="bottom"
              label={player2Label}
              background={BLUE}
            />
          </>
        )}

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

        {matchWinner && (
          <MatchOverOverlay
            winnerLabel={winnerLabel}
            setWins={setWins}
            onNewMatch={() => setWizardOpen(true)}
          />
        )}
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
  position: 'top' | 'bottom';
  label: string;
  background: string;
  onSwap?: () => void;
  swapLabel?: string;
}

function LabelDisplay({
  side,
  position,
  label,
  background,
  onSwap,
  swapLabel,
}: LabelDisplayProps) {
  const aura = [
    `0 0 4px ${background}`,
    `0 0 12px ${background}`,
    `0 0 24px ${background}`,
    '0 2px 8px rgba(0,0,0,0.3)',
  ].join(', ');

  const positioning = {
    [position === 'top' ? 'top' : 'bottom']: '11%',
    [side === 'left' ? 'left' : 'right']: `${SCORE_INSET_PCT}%`,
    transform: `translateX(${side === 'left' ? '-50%' : '50%'})`,
  };

  const styling = {
    ...positioning,
    fontSize: 'clamp(1.125rem, 3.6vw, 2.25rem)',
    textShadow: aura,
  } as const;

  if (onSwap) {
    return (
      <button
        type="button"
        onClick={onSwap}
        aria-label={swapLabel}
        className="absolute z-[6] flex max-w-[42%] cursor-pointer select-none items-center gap-1 truncate font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        style={styling}
      >
        <span className="truncate">{label}</span>
        <span aria-hidden className="opacity-80" style={{ fontSize: '0.6em' }}>
          ↕
        </span>
      </button>
    );
  }

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-[5] max-w-[42%] select-none truncate font-semibold text-white"
      style={styling}
    >
      {label}
    </span>
  );
}

interface MatchOverOverlayProps {
  winnerLabel: string;
  setWins: SetWins;
  onNewMatch: () => void;
}

function MatchOverOverlay({
  winnerLabel,
  setWins,
  onNewMatch,
}: MatchOverOverlayProps) {
  const { t } = useI18n();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('matchOver.label')}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 px-6 backdrop-blur-sm"
    >
      <div
        className="flex max-w-md flex-col items-center gap-3 rounded-2xl border p-6 text-center shadow-2xl"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      >
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--muted)' }}
        >
          {t('matchOver.label')}
        </p>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
          🏆 {t('matchOver.winnerText', { name: winnerLabel })}
        </h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {t('matchOver.score', { a: setWins.team1, b: setWins.team2 })}
        </p>
        <button
          type="button"
          onClick={onNewMatch}
          className="mt-2 rounded-xl px-5 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--primary)' }}
        >
          {t('matchOver.newMatch')}
        </button>
      </div>
    </div>
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
