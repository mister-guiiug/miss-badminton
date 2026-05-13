import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { RiveScene } from '../components/RiveScene';
import {
  MatchSetupWizard,
  type MatchConfig,
  type PointsCap,
  type SideChange,
  type Team,
} from '../components/MatchSetupWizard';
import { FullscreenPrompt } from '../components/FullscreenPrompt';
import { CourtOverlay, type ServiceSide } from '../components/CourtOverlay';
import { SideChangeBanner } from '../components/SideChangeBanner';
import { SetTransitionBanner } from '../components/SetTransitionBanner';
import { PwaInstallPrompt } from '../components/PwaInstallPrompt';
import { useI18n } from '../../i18n/useI18n';
import { useFeedback, type FeedbackEvent } from '../hooks/useFeedback';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useTeamColors } from '../hooks/useTeamColors';
import {
  storage,
  type PersistedGameState,
  type SavedMatch,
} from '../../storage';

const RIVE_SRC = `${import.meta.env.BASE_URL}rive/shuttle.riv`;
const SCORE_INSET_PCT = 20.5;
const SET_OFFSET_PCT = 7.34;

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

function isSetWon(
  scoreA: number,
  scoreB: number,
  target: number,
  cap: PointsCap
): boolean {
  if (cap !== null && scoreA >= cap && scoreA > scoreB) return true;
  return scoreA >= target && scoreA - scoreB >= 2;
}

function isSetPoint(
  scoreA: number,
  scoreB: number,
  target: number,
  cap: PointsCap
): boolean {
  return isSetWon(scoreA + 1, scoreB, target, cap);
}

interface GameState {
  score1: number;
  score2: number;
  setWins: SetWins;
  matchWinner: ServiceSide | null;
  server: ServiceSide | null;
  setScores: { team1: number; team2: number }[];
  pendingSideChange: boolean;
  mid11Triggered: boolean;
  history: HistoryEntry[];
  pendingFeedback: FeedbackEvent | null;
  lastSetSummary: { winner: ServiceSide; a: number; b: number } | null;
  startedAt: number | null;
  endedAt: number | null;
  streak1: number;
  streak2: number;
  maxStreak1: number;
  maxStreak2: number;
}

interface HistoryEntry {
  score1: number;
  score2: number;
  setWins: SetWins;
  server: ServiceSide | null;
  team: ServiceSide;
  setEnded: boolean;
  matchEnded: boolean;
  setScoresLength: number;
  pendingSideChange: boolean;
  mid11Triggered: boolean;
  startedAt: number | null;
  endedAt: number | null;
  streak1: number;
  streak2: number;
  maxStreak1: number;
  maxStreak2: number;
}

const INITIAL_GAME_STATE: GameState = {
  score1: 0,
  score2: 0,
  setWins: { team1: 0, team2: 0 },
  matchWinner: null,
  server: null,
  setScores: [],
  pendingSideChange: false,
  mid11Triggered: false,
  history: [],
  pendingFeedback: null,
  lastSetSummary: null,
  startedAt: null,
  endedAt: null,
  streak1: 0,
  streak2: 0,
  maxStreak1: 0,
  maxStreak2: 0,
};

type GameAction =
  | {
      type: 'score';
      team: ServiceSide;
      target: number;
      cap: PointsCap;
      setsToWin: number;
      sideChange: SideChange;
      totalSets: number;
      now: number;
    }
  | { type: 'undo' }
  | { type: 'swap' }
  | { type: 'reset' }
  | { type: 'restart' }
  | { type: 'dismissSideChange' }
  | { type: 'clearFeedback' }
  | { type: 'clearSetSummary' }
  | { type: 'hydrate'; state: PersistedGameState };

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
      const team1Won = isSetWon(nextS1, nextS2, action.target, action.cap);
      const team2Won = isSetWon(nextS2, nextS1, action.target, action.cap);
      const setEnded = team1Won || team2Won;

      const baseHistory: HistoryEntry = {
        score1: state.score1,
        score2: state.score2,
        setWins: state.setWins,
        server: state.server,
        team: action.team,
        setEnded,
        matchEnded: false,
        setScoresLength: state.setScores.length,
        pendingSideChange: state.pendingSideChange,
        mid11Triggered: state.mid11Triggered,
        startedAt: state.startedAt,
        endedAt: state.endedAt,
        streak1: state.streak1,
        streak2: state.streak2,
        maxStreak1: state.maxStreak1,
        maxStreak2: state.maxStreak2,
      };

      const startedAt = state.startedAt ?? action.now;
      const nextStreak1 = action.team === 'team1' ? state.streak1 + 1 : 0;
      const nextStreak2 = action.team === 'team2' ? state.streak2 + 1 : 0;
      const nextMaxStreak1 = Math.max(state.maxStreak1, nextStreak1);
      const nextMaxStreak2 = Math.max(state.maxStreak2, nextStreak2);

      if (setEnded) {
        const winnerSide: ServiceSide = team1Won ? 'team1' : 'team2';
        const nextSetWins: SetWins = {
          team1: state.setWins.team1 + (team1Won ? 1 : 0),
          team2: state.setWins.team2 + (team2Won ? 1 : 0),
        };
        const matchEnded = nextSetWins[winnerSide] >= action.setsToWin;
        const nextSetScores = [
          ...state.setScores,
          { team1: nextS1, team2: nextS2 },
        ];
        const totalSetsPlayed = nextSetWins.team1 + nextSetWins.team2;
        const isDecidingNext =
          !matchEnded &&
          Math.max(nextSetWins.team1, nextSetWins.team2) ===
            action.setsToWin - 1 &&
          totalSetsPlayed === action.totalSets - 1;
        let pendingSideChange = false;
        if (!matchEnded) {
          if (action.sideChange === 'each-set') pendingSideChange = true;
          else if (action.sideChange === 'decisive' && isDecidingNext)
            pendingSideChange = true;
        }
        return {
          score1: 0,
          score2: 0,
          server: null,
          setWins: nextSetWins,
          matchWinner: matchEnded ? winnerSide : null,
          setScores: nextSetScores,
          pendingSideChange,
          mid11Triggered: false,
          history: [...state.history, { ...baseHistory, matchEnded }],
          pendingFeedback: matchEnded ? 'matchWon' : 'setWon',
          lastSetSummary: {
            winner: winnerSide,
            a: nextS1,
            b: nextS2,
          },
          startedAt,
          endedAt: matchEnded ? action.now : null,
          streak1: 0,
          streak2: 0,
          maxStreak1: nextMaxStreak1,
          maxStreak2: nextMaxStreak2,
        };
      }

      let pendingSideChange = state.pendingSideChange;
      let mid11Triggered = state.mid11Triggered;
      if (
        action.sideChange === 'mid-match' &&
        !mid11Triggered &&
        (nextS1 === 11 || nextS2 === 11)
      ) {
        pendingSideChange = true;
        mid11Triggered = true;
      }
      return {
        ...state,
        score1: nextS1,
        score2: nextS2,
        server: action.team,
        pendingSideChange,
        mid11Triggered,
        history: [...state.history, baseHistory],
        pendingFeedback: 'point',
        lastSetSummary: null,
        startedAt,
        streak1: nextStreak1,
        streak2: nextStreak2,
        maxStreak1: nextMaxStreak1,
        maxStreak2: nextMaxStreak2,
      };
    }
    case 'undo': {
      if (state.history.length === 0) return state;
      const last = state.history[state.history.length - 1];
      return {
        score1: last.score1,
        score2: last.score2,
        setWins: last.setWins,
        server: last.server,
        matchWinner: null,
        setScores: state.setScores.slice(0, last.setScoresLength),
        pendingSideChange: last.pendingSideChange,
        mid11Triggered: last.mid11Triggered,
        history: state.history.slice(0, -1),
        pendingFeedback: null,
        lastSetSummary: null,
        startedAt: last.startedAt,
        endedAt: last.endedAt,
        streak1: last.streak1,
        streak2: last.streak2,
        maxStreak1: last.maxStreak1,
        maxStreak2: last.maxStreak2,
      };
    }
    case 'swap':
      return {
        score1: state.score2,
        score2: state.score1,
        setWins: { team1: state.setWins.team2, team2: state.setWins.team1 },
        matchWinner: flipSide(state.matchWinner),
        server: flipSide(state.server),
        setScores: state.setScores.map(s => ({
          team1: s.team2,
          team2: s.team1,
        })),
        pendingSideChange: false,
        mid11Triggered: state.mid11Triggered,
        history: [],
        pendingFeedback: null,
        lastSetSummary: state.lastSetSummary
          ? {
              winner: flipSide(state.lastSetSummary.winner) ?? 'team1',
              a: state.lastSetSummary.b,
              b: state.lastSetSummary.a,
            }
          : null,
        startedAt: state.startedAt,
        endedAt: state.endedAt,
        streak1: state.streak2,
        streak2: state.streak1,
        maxStreak1: state.maxStreak2,
        maxStreak2: state.maxStreak1,
      };
    case 'reset':
      return {
        ...INITIAL_GAME_STATE,
      };
    case 'restart':
      return INITIAL_GAME_STATE;
    case 'dismissSideChange':
      return { ...state, pendingSideChange: false };
    case 'clearFeedback':
      return { ...state, pendingFeedback: null };
    case 'clearSetSummary':
      return { ...state, lastSetSummary: null };
    case 'hydrate':
      return {
        ...INITIAL_GAME_STATE,
        ...action.state,
        history: [],
        pendingFeedback: null,
        lastSetSummary: null,
      };
  }
}

function loadInitialMatch(): MatchConfig | null {
  return storage.loadActiveMatch();
}

function loadInitialGame(): GameState {
  const stored = storage.loadActiveGame();
  if (!stored) return INITIAL_GAME_STATE;
  return {
    ...INITIAL_GAME_STATE,
    ...stored,
    history: [],
    pendingFeedback: null,
    lastSetSummary: null,
  };
}

export function HomeView() {
  const { t, locale } = useI18n();
  const feedback = useFeedback();
  const colors = useTeamColors();

  const [game, dispatch] = useReducer(gameReducer, undefined, loadInitialGame);
  const {
    score1,
    score2,
    setWins,
    matchWinner,
    server,
    setScores,
    pendingSideChange,
    pendingFeedback,
    lastSetSummary,
    startedAt,
    endedAt,
    streak1,
    streak2,
    maxStreak1,
    maxStreak2,
  } = game;
  const [match, setMatch] = useState<MatchConfig | null>(loadInitialMatch);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [team1Inverted, setTeam1Inverted] = useState(false);
  const [team2Inverted, setTeam2Inverted] = useState(false);
  const savedMatchIdRef = useRef<string | null>(null);

  // Persist match config and game state across reloads.
  useEffect(() => {
    storage.saveActiveMatch(match);
  }, [match]);

  useEffect(() => {
    if (matchWinner) {
      storage.saveActiveGame(null);
      return;
    }
    if (match) {
      const persisted: PersistedGameState = {
        score1,
        score2,
        setWins,
        matchWinner,
        server,
        setScores,
        pendingSideChange,
        mid11Triggered: game.mid11Triggered,
        startedAt,
        endedAt,
        streak1,
        streak2,
        maxStreak1,
        maxStreak2,
      };
      storage.saveActiveGame(persisted);
    } else {
      storage.saveActiveGame(null);
    }
  }, [
    match,
    score1,
    score2,
    setWins,
    server,
    setScores,
    pendingSideChange,
    matchWinner,
    game.mid11Triggered,
    startedAt,
    endedAt,
    streak1,
    streak2,
    maxStreak1,
    maxStreak2,
  ]);

  // Fire feedback effects (sound + haptic) after the reducer marks an event.
  useEffect(() => {
    if (pendingFeedback) {
      feedback.trigger(pendingFeedback);
      dispatch({ type: 'clearFeedback' });
    }
  }, [pendingFeedback, feedback]);

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

  const handleScore = useCallback(
    (which: ServiceSide) => {
      if (!match) {
        setWizardOpen(true);
        return;
      }
      dispatch({
        type: 'score',
        team: which,
        target: match.points,
        cap: match.cap,
        setsToWin: setsNeededToWin(match.sets),
        sideChange: match.sideChange,
        totalSets: match.sets,
        now: Date.now(),
      });
    },
    [match]
  );

  const handleUndo = useCallback(() => {
    dispatch({ type: 'undo' });
  }, []);

  const handleComplete = (config: MatchConfig) => {
    setMatch(config);
    dispatch({ type: 'restart' });
    setTeam1Inverted(false);
    setTeam2Inverted(false);
    savedMatchIdRef.current = null;
    setWizardOpen(false);
  };

  const handleSwap = useCallback(() => {
    if (!match) {
      setWizardOpen(true);
      return;
    }
    setMatch({ ...match, team1: match.team2, team2: match.team1 });
    const prevT1 = team1Inverted;
    setTeam1Inverted(team2Inverted);
    setTeam2Inverted(prevT1);
    dispatch({ type: 'swap' });
  }, [match, team1Inverted, team2Inverted]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'reset' });
    savedMatchIdRef.current = null;
  }, []);

  useKeyboardShortcuts(
    useMemo(
      () => ({
        onTeam1: () => handleScore('team1'),
        onTeam2: () => handleScore('team2'),
        onUndo: handleUndo,
        onReset: handleReset,
        onSwap: handleSwap,
      }),
      [handleScore, handleUndo, handleReset, handleSwap]
    )
  );

  const serverScore = server === 'team1' ? score1 : score2;
  const winnerLabel =
    matchWinner === 'team1'
      ? player1Label
      : matchWinner === 'team2'
        ? player2Label
        : '';

  const setNumber = setScores.length + 1;
  const totalSets = match?.sets ?? 0;
  const pointsTarget = match?.points;

  const team1AtSetPoint =
    !!match &&
    !matchWinner &&
    isSetPoint(score1, score2, match.points, match.cap);
  const team2AtSetPoint =
    !!match &&
    !matchWinner &&
    isSetPoint(score2, score1, match.points, match.cap);
  const setsToWin = match ? setsNeededToWin(match.sets) : 0;
  const team1AtMatchPoint = team1AtSetPoint && setWins.team1 + 1 >= setsToWin;
  const team2AtMatchPoint = team2AtSetPoint && setWins.team2 + 1 >= setsToWin;

  // Save completed match to history (once per finished match).
  useEffect(() => {
    if (!matchWinner || !match) {
      savedMatchIdRef.current = null;
      return;
    }
    if (savedMatchIdRef.current) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    savedMatchIdRef.current = id;
    const durationMs =
      startedAt && endedAt ? Math.max(0, endedAt - startedAt) : undefined;
    const saved: SavedMatch = {
      id,
      completedAt: Date.now(),
      config: match,
      setScores,
      finalSetWins: setWins,
      winner: matchWinner,
      durationMs,
      maxStreak: { team1: maxStreak1, team2: maxStreak2 },
    };
    storage.saveMatchToHistory(saved);
  }, [
    matchWinner,
    match,
    setScores,
    setWins,
    startedAt,
    endedAt,
    maxStreak1,
    maxStreak2,
  ]);

  const handleShare = async () => {
    if (!match || !matchWinner) return;
    const setsText = setScores.map(s => `${s.team1}-${s.team2}`).join(', ');
    const body = t('scoreboard.shareBody', {
      a: player1Label,
      sa: setWins.team1,
      sb: setWins.team2,
      b: player2Label,
      sets: setsText,
    });
    const nav: Navigator | undefined =
      typeof navigator === 'undefined' ? undefined : navigator;
    try {
      if (nav && typeof nav.share === 'function') {
        await nav.share({
          title: t('scoreboard.shareTitle'),
          text: body,
        });
      } else if (nav && typeof nav.clipboard?.writeText === 'function') {
        await nav.clipboard.writeText(body);
      }
    } catch {
      /* user cancelled or share failed */
    }
  };

  return (
    <>
      <FullscreenPrompt />
      <PwaInstallPrompt />
      <section
        aria-label={t('home.scoreboardLabel')}
        className="relative w-full overflow-hidden shadow-2xl"
        style={{ aspectRatio: '16 / 10', boxShadow: 'var(--shadow)' }}
      >
        <div className="absolute inset-0 grid grid-cols-2">
          <ScorePanel
            background={colors.team1}
            textColor="#ffffff"
            onScore={() => handleScore('team1')}
            ariaLabel={t('scoreboard.addPoint', { name: player1Label })}
          />
          <ScorePanel
            background={colors.team2}
            textColor="#ffffff"
            onScore={() => handleScore('team2')}
            ariaLabel={t('scoreboard.addPoint', { name: player2Label })}
          />
        </div>

        <CourtOverlay server={server} serverScore={serverScore} />

        {match && pointsTarget && (
          <SetHeader
            label={t('scoreboard.setHeader', {
              n: setNumber,
              total: totalSets,
              points: pointsTarget,
            })}
          />
        )}

        <ScoreDisplay
          side="left"
          score={score1}
          background={colors.team1}
          locale={locale}
          atSetPoint={team1AtSetPoint}
          atMatchPoint={team1AtMatchPoint}
          setPointLabel={t('scoreboard.setPoint')}
          matchPointLabel={t('scoreboard.matchPoint')}
        />
        <ScoreDisplay
          side="right"
          score={score2}
          background={colors.team2}
          locale={locale}
          atSetPoint={team2AtSetPoint}
          atMatchPoint={team2AtMatchPoint}
          setPointLabel={t('scoreboard.setPoint')}
          matchPointLabel={t('scoreboard.matchPoint')}
        />

        {streak1 >= 2 && (
          <StreakBadge
            side="left"
            label={t('scoreboard.streak', { n: streak1 })}
          />
        )}
        {streak2 >= 2 && (
          <StreakBadge
            side="right"
            label={t('scoreboard.streak', { n: streak2 })}
          />
        )}

        <SetScoreDisplay
          side="left"
          count={setWins.team1}
          background={colors.team1}
        />
        <SetScoreDisplay
          side="right"
          count={setWins.team2}
          background={colors.team2}
        />

        {isDoubles ? (
          <>
            <LabelDisplay
              side="left"
              position="top"
              label={team1Pair.top}
              background={colors.team1}
              onSwap={() => setTeam1Inverted(s => !s)}
              swapLabel={t('scoreboard.invertPlayers')}
            />
            <LabelDisplay
              side="left"
              position="bottom"
              label={team1Pair.bottom}
              background={colors.team1}
              onSwap={() => setTeam1Inverted(s => !s)}
              swapLabel={t('scoreboard.invertPlayers')}
            />
            <LabelDisplay
              side="right"
              position="top"
              label={team2Pair.top}
              background={colors.team2}
              onSwap={() => setTeam2Inverted(s => !s)}
              swapLabel={t('scoreboard.invertPlayers')}
            />
            <LabelDisplay
              side="right"
              position="bottom"
              label={team2Pair.bottom}
              background={colors.team2}
              onSwap={() => setTeam2Inverted(s => !s)}
              swapLabel={t('scoreboard.invertPlayers')}
            />
          </>
        ) : (
          <>
            <LabelDisplay
              side="left"
              position="bottom"
              label={player1Label}
              background={colors.team1}
            />
            <LabelDisplay
              side="right"
              position="bottom"
              label={player2Label}
              background={colors.team2}
            />
          </>
        )}

        <div
          className="pointer-events-none absolute left-1/2 z-10"
          style={{
            top: '18%',
            transform: 'translate(-50%, -50%)',
            width: 'min(14%, 92px)',
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
            <MatchDuration startedAt={startedAt} endedAt={endedAt} />
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
              onClick={handleUndo}
              disabled={game.history.length === 0}
              aria-label={t('scoreboard.undo')}
              className="rounded-md px-2 py-1 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden>↶</span>
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

        {pendingSideChange && !matchWinner && (
          <SideChangeBanner
            onSwap={() => {
              handleSwap();
            }}
            onDismiss={() => dispatch({ type: 'dismissSideChange' })}
          />
        )}

        {lastSetSummary && !matchWinner && (
          <SetTransitionBanner
            winnerName={
              lastSetSummary.winner === 'team1' ? player1Label : player2Label
            }
            scoreA={lastSetSummary.a}
            scoreB={lastSetSummary.b}
            onClose={() => dispatch({ type: 'clearSetSummary' })}
          />
        )}

        {matchWinner && (
          <MatchOverOverlay
            winnerLabel={winnerLabel}
            setWins={setWins}
            setScores={setScores}
            onNewMatch={() => setWizardOpen(true)}
            onShare={handleShare}
            canShare={
              typeof navigator !== 'undefined' &&
              (typeof navigator.share === 'function' ||
                typeof navigator.clipboard?.writeText === 'function')
            }
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
  locale: string;
  atSetPoint: boolean;
  atMatchPoint: boolean;
  setPointLabel: string;
  matchPointLabel: string;
}

function ScoreDisplay({
  side,
  score,
  background,
  locale,
  atSetPoint,
  atMatchPoint,
  setPointLabel,
  matchPointLabel,
}: ScoreDisplayProps) {
  const aura = [
    `0 0 6px ${background}`,
    `0 0 14px ${background}`,
    `0 0 28px ${background}`,
    `0 0 56px ${background}`,
    '0 6px 22px rgba(0,0,0,0.32)',
  ].join(', ');

  // Small downward nudge so the digit's optical centre sits on the horizontal
  // court line (font ascenders push the bounding-box centre above the visual
  // centre of numerals).
  const baseTransform = `translate(${side === 'left' ? '-50%' : '50%'}, calc(-50% + 0.06em))`;
  const label = atMatchPoint
    ? matchPointLabel
    : atSetPoint
      ? setPointLabel
      : '';

  return (
    <span
      aria-hidden
      key={`${score}-${locale}`}
      className="pointer-events-none absolute z-[5] select-none font-medium leading-none text-white"
      style={{
        top: '50%',
        [side === 'left' ? 'left' : 'right']: `${SCORE_INSET_PCT}%`,
        transform: baseTransform,
        fontVariantNumeric: 'tabular-nums',
        fontSize: 'clamp(5rem, 22vw, 18rem)',
        letterSpacing: '-0.04em',
        textShadow: aura,
        ['--mb-score-transform' as string]: baseTransform,
        animation: 'mb-score-pop 220ms ease-out',
      }}
    >
      {formatScore(score)}
      {label && (
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center text-[0.18em] font-bold uppercase tracking-widest"
          style={{
            top: '0.08em',
            color: '#fff200',
            textShadow: `0 0 4px ${background}, 0 0 10px rgba(0,0,0,0.4)`,
          }}
        >
          {label}
        </span>
      )}
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
        top: '18%',
        left: `${leftPct}%`,
        transform: 'translate(-50%, -50%)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 'clamp(2.5rem, 7.5vw, 6rem)',
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

interface SetHeaderProps {
  label: string;
}

function SetHeader({ label }: SetHeaderProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1 z-[5] flex justify-center">
      <span
        className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white sm:text-xs"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      >
        {label}
      </span>
    </div>
  );
}

interface MatchOverOverlayProps {
  winnerLabel: string;
  setWins: SetWins;
  setScores: { team1: number; team2: number }[];
  onNewMatch: () => void;
  onShare: () => void;
  canShare: boolean;
}

function MatchOverOverlay({
  winnerLabel,
  setWins,
  setScores,
  onNewMatch,
  onShare,
  canShare,
}: MatchOverOverlayProps) {
  const { t } = useI18n();
  const setsLine = setScores.map(s => `${s.team1}-${s.team2}`).join(', ');
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
        {setsLine && (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {t('matchOver.setsList', { sets: setsLine })}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onNewMatch}
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--primary)' }}
          >
            {t('matchOver.newMatch')}
          </button>
          {canShare && (
            <button
              type="button"
              onClick={onShare}
              className="rounded-xl px-5 py-2 text-sm font-semibold"
              style={{
                background: 'var(--surface-highlight)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              {t('matchOver.share')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface MatchDurationProps {
  startedAt: number | null;
  endedAt: number | null;
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function MatchDuration({ startedAt, endedAt }: MatchDurationProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt || endedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, endedAt]);

  if (!startedAt) return null;
  const elapsed = (endedAt ?? now) - startedAt;
  return (
    <span
      aria-hidden
      className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium tabular-nums opacity-90"
    >
      <span aria-hidden>⏱</span>
      {formatDuration(elapsed)}
    </span>
  );
}

interface StreakBadgeProps {
  side: 'left' | 'right';
  label: string;
}

function StreakBadge({ side, label }: StreakBadgeProps) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-[5] flex select-none items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-md sm:text-sm"
      style={{
        top: '78%',
        [side === 'left' ? 'left' : 'right']: `${SCORE_INSET_PCT}%`,
        transform: `translateX(${side === 'left' ? '-50%' : '50%'})`,
        background: 'rgba(0,0,0,0.55)',
      }}
    >
      <span aria-hidden>🔥</span>
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
