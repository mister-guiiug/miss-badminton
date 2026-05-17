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
import { useTapOrLongPress } from '../hooks/useTapOrLongPress';
import { ScoreToast } from '../components/ScoreToast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { OnboardingHint } from '../components/OnboardingHint';
import { Logo } from '../components/Logo';
import {
  ArrowLeftRightIcon,
  ArrowUpDownIcon,
  FlameIcon,
  HomeIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  RotateCcwIcon,
  RotateCwIcon,
  Share2Icon,
  TimerResetIcon,
  TrophyIcon,
  Undo2Icon,
} from '../components/icons';
import {
  storage,
  type PersistedGameState,
  type SavedMatch,
} from '../../storage';

// Détecte à la compilation les .riv présents sous src/assets/rive/. Évite
// ainsi tout fetch (et donc tout 404) quand le fichier n'a pas été déposé.
const riveAssets = import.meta.glob<{ default: string }>(
  '../../assets/rive/*.riv',
  { eager: true, query: '?url' }
);
const RIVE_BY_NAME: Record<string, string> = {};
for (const [path, mod] of Object.entries(riveAssets)) {
  const name = path.split('/').pop();
  if (name) RIVE_BY_NAME[name] = mod.default;
}

const RIVE_SRC: string | null = RIVE_BY_NAME['shuttle.riv'] ?? null;
const SCORE_INSET_PCT = 20.5;
const SET_OFFSET_PCT = 9;

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

/**
 * Nombre maximum de sets pouvant être joués dans un match donné.
 * `setsToWin` est le nombre de sets gagnants requis ; au pire l'adversaire
 * en gagne `setsToWin - 1` avant le dernier set décisif.
 */
function maxTotalSets(setsToWin: number): number {
  return 2 * setsToWin - 1;
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
  /** Timestamp où le chrono est mis en pause (null = actif). */
  pausedAt: number | null;
  /** Cumul de temps passé en pause depuis startedAt (ms). */
  totalPausedMs: number;
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
  pausedAt: number | null;
  totalPausedMs: number;
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
  pausedAt: null,
  totalPausedMs: 0,
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
  | { type: 'subtract'; team: ServiceSide }
  | { type: 'undo' }
  | { type: 'swap' }
  | { type: 'reset' }
  | { type: 'restart' }
  | { type: 'dismissSideChange' }
  | { type: 'clearFeedback' }
  | { type: 'clearSetSummary' }
  | { type: 'pauseChrono'; now: number }
  | { type: 'resumeChrono'; now: number }
  | { type: 'resetChrono'; now: number }
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
        pausedAt: state.pausedAt,
        totalPausedMs: state.totalPausedMs,
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
          pausedAt: state.pausedAt,
          totalPausedMs: state.totalPausedMs,
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
    case 'subtract': {
      if (state.matchWinner) return state;
      const cur = action.team === 'team1' ? state.score1 : state.score2;
      if (cur <= 0) return state;
      const nextS1 = action.team === 'team1' ? state.score1 - 1 : state.score1;
      const nextS2 = action.team === 'team2' ? state.score2 - 1 : state.score2;
      // On enregistre dans l'historique pour permettre l'undo classique.
      const baseHistory: HistoryEntry = {
        score1: state.score1,
        score2: state.score2,
        setWins: state.setWins,
        server: state.server,
        team: action.team,
        setEnded: false,
        matchEnded: false,
        setScoresLength: state.setScores.length,
        pendingSideChange: state.pendingSideChange,
        mid11Triggered: state.mid11Triggered,
        startedAt: state.startedAt,
        endedAt: state.endedAt,
        pausedAt: state.pausedAt,
        totalPausedMs: state.totalPausedMs,
        streak1: state.streak1,
        streak2: state.streak2,
        maxStreak1: state.maxStreak1,
        maxStreak2: state.maxStreak2,
      };
      return {
        ...state,
        score1: nextS1,
        score2: nextS2,
        // L'équipe qui perd un point ne récupère pas le service, on garde
        // simplement l'état précédent côté serveur (ou null si égalité 0-0).
        history: [...state.history, baseHistory],
        pendingFeedback: 'point',
        // Réinitialise les streaks (le point était une erreur).
        streak1: action.team === 'team1' ? 0 : state.streak1,
        streak2: action.team === 'team2' ? 0 : state.streak2,
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
        pausedAt: last.pausedAt,
        totalPausedMs: last.totalPausedMs,
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
        pausedAt: state.pausedAt,
        totalPausedMs: state.totalPausedMs,
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
    case 'pauseChrono': {
      if (state.pausedAt !== null) return state; // déjà en pause
      if (state.startedAt === null) return state; // chrono pas démarré
      if (state.endedAt !== null) return state; // match terminé
      return { ...state, pausedAt: action.now };
    }
    case 'resumeChrono': {
      if (state.pausedAt === null) return state;
      const pausedDuration = action.now - state.pausedAt;
      return {
        ...state,
        pausedAt: null,
        totalPausedMs: state.totalPausedMs + Math.max(0, pausedDuration),
      };
    }
    case 'resetChrono': {
      // Remet le chrono à 0 (en gardant l'état du match).
      // Si pause active, on garde la pause (chrono à 0 et en pause).
      return {
        ...state,
        startedAt: state.startedAt === null ? null : action.now,
        totalPausedMs: 0,
        pausedAt: state.pausedAt === null ? null : action.now,
      };
    }
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
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetChronoConfirmOpen, setResetChronoConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{
    key: number;
    message: string;
    color: string;
  } | null>(null);
  const savedMatchIdRef = useRef<string | null>(null);
  const toastKeyRef = useRef(0);

  // "Rejouer" depuis l'historique : ouvre le wizard pré-rempli au montage.
  useEffect(() => {
    const pending = storage.consumePendingReplay();
    if (pending) {
      setMatch(pending);
      dispatch({ type: 'restart' });
      setWizardOpen(true);
    }
  }, []);

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
        pausedAt: game.pausedAt,
        totalPausedMs: game.totalPausedMs,
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
    game.pausedAt,
    game.totalPausedMs,
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

  // Fallbacks suivent l'id stable de l'équipe : après une permutation, on
  // voit visuellement le changement même si aucun nom n'a été saisi.
  const team1Fallbacks: [string, string] =
    match?.team1.id === 'B'
      ? [t('players.player2'), t('players.partner2')]
      : [t('players.player1'), t('players.partner1')];
  const team2Fallbacks: [string, string] =
    match?.team2.id === 'A'
      ? [t('players.player1'), t('players.partner1')]
      : [t('players.player2'), t('players.partner2')];
  const player1Label = match
    ? resolveTeamLabel(match.team1, team1Fallbacks)
    : t('players.player1');
  const player2Label = match
    ? resolveTeamLabel(match.team2, team2Fallbacks)
    : t('players.player2');

  const isDoubles = match?.type === 'doubles';

  function teamPair(
    team: Team | undefined,
    inverted: boolean,
    fallbacks: [string, string]
  ): { top: string; bottom: string } {
    if (!team || !team.partner) {
      // Doubles avec partner manquant : on ne montre PAS de fallback —
      // seule la pastille du bas reste visible (avec son icône ↕), sans
      // texte tant que rien n'est saisi.
      return { top: '', bottom: team?.primary ?? '' };
    }
    const primary = team.primary || fallbacks[0];
    const partner = team.partner || fallbacks[1];
    return inverted
      ? { top: primary, bottom: partner }
      : { top: partner, bottom: primary };
  }

  const team1Pair = teamPair(match?.team1, team1Inverted, team1Fallbacks);
  const team2Pair = teamPair(match?.team2, team2Inverted, team2Fallbacks);

  const showToast = useCallback((message: string, color: string) => {
    toastKeyRef.current += 1;
    setToast({ key: toastKeyRef.current, message, color });
  }, []);

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
        setsToWin: match.sets,
        sideChange: match.sideChange,
        totalSets: maxTotalSets(match.sets),
        now: Date.now(),
      });
    },
    [match]
  );

  const handleSubtract = useCallback(
    (which: ServiceSide) => {
      if (!match) return;
      dispatch({ type: 'subtract', team: which });
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
    setMatch(curr => {
      if (!curr) {
        setWizardOpen(true);
        return curr;
      }
      return { ...curr, team1: curr.team2, team2: curr.team1 };
    });
    // On croise les drapeaux d'inversion via leurs valeurs capturées dans la
    // closure (suffisant : `team1Inverted` et `team2Inverted` sont dans les
    // deps du useCallback, donc toujours à jour à l'appel).
    setTeam1Inverted(team2Inverted);
    setTeam2Inverted(team1Inverted);
    dispatch({ type: 'swap' });
  }, [team1Inverted, team2Inverted]);

  const handleReset = useCallback(() => {
    setResetConfirmOpen(true);
  }, []);

  const confirmReset = useCallback(() => {
    dispatch({ type: 'reset' });
    savedMatchIdRef.current = null;
    setResetConfirmOpen(false);
  }, []);

  const handleRematch = useCallback(() => {
    if (!match) return;
    dispatch({ type: 'restart' });
    setTeam1Inverted(false);
    setTeam2Inverted(false);
    savedMatchIdRef.current = null;
  }, [match]);

  /**
   * "Retour à l'accueil" depuis le MatchOverOverlay : on efface le match en
   * cours et on réinitialise le scoreboard. L'overlay se ferme automatiquement
   * (matchWinner devient null après reset).
   */
  const handleBackHome = useCallback(() => {
    setMatch(null);
    dispatch({ type: 'reset' });
    setTeam1Inverted(false);
    setTeam2Inverted(false);
    savedMatchIdRef.current = null;
  }, []);

  const handleToggleChrono = useCallback(() => {
    if (game.pausedAt !== null) {
      dispatch({ type: 'resumeChrono', now: Date.now() });
    } else {
      dispatch({ type: 'pauseChrono', now: Date.now() });
    }
  }, [game.pausedAt]);

  const handleResetChrono = useCallback(() => {
    setResetChronoConfirmOpen(true);
  }, []);

  const confirmResetChrono = useCallback(() => {
    dispatch({ type: 'resetChrono', now: Date.now() });
    setResetChronoConfirmOpen(false);
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
  const totalSets = match ? maxTotalSets(match.sets) : 0;
  const pointsTarget = match?.points;

  const team1AtSetPoint =
    !!match &&
    !matchWinner &&
    isSetPoint(score1, score2, match.points, match.cap);
  const team2AtSetPoint =
    !!match &&
    !matchWinner &&
    isSetPoint(score2, score1, match.points, match.cap);
  const setsToWin = match?.sets ?? 0;
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
      <OnboardingHint />
      <div className="mb-scoreboard-wrap relative w-full">
        <section
          aria-label={t('home.scoreboardLabel')}
          className="mb-scoreboard relative w-full overflow-hidden shadow-2xl"
          style={{ boxShadow: 'var(--shadow)' }}
        >
          <div className="absolute inset-0 grid grid-cols-2">
            <ScorePanel
              background={colors.team1}
              textColor="#ffffff"
              onScore={() => {
                handleScore('team1');
                showToast(
                  t('toast.pointAdded', { name: player1Label }),
                  colors.team1
                );
              }}
              onSubtract={() => {
                if (score1 > 0) {
                  handleSubtract('team1');
                  showToast(
                    t('toast.pointRemoved', { name: player1Label }),
                    colors.team1
                  );
                }
              }}
              ariaLabel={t('scoreboard.addPoint', { name: player1Label })}
              subtractLabel={t('scoreSubtract', { name: player1Label })}
            />
            <ScorePanel
              background={colors.team2}
              textColor="#ffffff"
              onScore={() => {
                handleScore('team2');
                showToast(
                  t('toast.pointAdded', { name: player2Label }),
                  colors.team2
                );
              }}
              onSubtract={() => {
                if (score2 > 0) {
                  handleSubtract('team2');
                  showToast(
                    t('toast.pointRemoved', { name: player2Label }),
                    colors.team2
                  );
                }
              }}
              ariaLabel={t('scoreboard.addPoint', { name: player2Label })}
              subtractLabel={t('scoreSubtract', { name: player2Label })}
            />
          </div>

          <CourtOverlay
            server={server}
            serverScore={serverScore}
            team1Color={colors.team1}
            team2Color={colors.team2}
          />

          {/* Annonce vocale du score pour les lecteurs d'écran */}
          <span className="sr-only" role="status" aria-live="polite">
            {t('liveScore', { a: score1, b: score2 })}
          </span>

          {toast && (
            <ScoreToast
              key={toast.key}
              triggerKey={toast.key}
              message={toast.message}
              background={toast.color}
            />
          )}

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
              {team1Pair.top && (
                <LabelDisplay
                  side="left"
                  position="top"
                  label={team1Pair.top}
                  background={colors.team1}
                  onSwap={() => setTeam1Inverted(s => !s)}
                  swapLabel={t('scoreboard.invertPlayers')}
                />
              )}
              <LabelDisplay
                side="left"
                position="bottom"
                label={team1Pair.bottom}
                background={colors.team1}
                onSwap={() => setTeam1Inverted(s => !s)}
                swapLabel={t('scoreboard.invertPlayers')}
              />
              {team2Pair.top && (
                <LabelDisplay
                  side="right"
                  position="top"
                  label={team2Pair.top}
                  background={colors.team2}
                  onSwap={() => setTeam2Inverted(s => !s)}
                  swapLabel={t('scoreboard.invertPlayers')}
                />
              )}
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
            {RIVE_SRC ? (
              <RiveScene
                src={RIVE_SRC}
                ariaLabel={t('home.scoreboardLabel')}
                className="h-full w-full"
                fallback={<ShuttleFallback />}
              />
            ) : (
              <ShuttleFallback />
            )}
          </div>

          <button
            type="button"
            onClick={handleSwap}
            aria-label={t('scoreboard.swap')}
            className="absolute left-1/2 top-1/2 z-20 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg ring-2 ring-black/10 transition-transform hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
            style={{ background: '#ffffff', color: '#1f2937' }}
          >
            <ArrowLeftRightIcon size={24} strokeWidth={2.4} />
          </button>

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
              onRematch={handleRematch}
              onBackHome={handleBackHome}
              onShare={handleShare}
              canShare={
                typeof navigator !== 'undefined' &&
                (typeof navigator.share === 'function' ||
                  typeof navigator.clipboard?.writeText === 'function')
              }
            />
          )}
        </section>

        <footer className="mb-scoreboard-footer flex items-center justify-between gap-2 bg-black/55 px-4 text-white backdrop-blur-sm">
          <span className="flex min-w-0 items-center gap-2 truncate text-sm font-medium">
            <Logo size={18} />
            <span className="hidden truncate sm:inline">
              {t('scoreboard.title')}
            </span>
            <MatchDuration
              startedAt={startedAt}
              endedAt={endedAt}
              pausedAt={game.pausedAt}
              totalPausedMs={game.totalPausedMs}
              onToggle={handleToggleChrono}
              onReset={handleResetChrono}
              pauseLabel={t('scoreboard.pauseChrono')}
              resumeLabel={t('scoreboard.resumeChrono')}
              resetLabel={t('scoreboard.resetChrono')}
            />
          </span>
          <div className="flex items-center gap-1 text-base">
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              aria-label={t('scoreboard.edit')}
              className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/10"
            >
              <PencilIcon size={18} />
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={game.history.length === 0}
              aria-label={t('scoreboard.undo')}
              className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2Icon size={18} />
            </button>
            <button
              type="button"
              onClick={handleReset}
              aria-label={t('scoreboard.reset')}
              className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/10"
            >
              <RotateCcwIcon size={18} />
            </button>
          </div>
        </footer>
      </div>

      {wizardOpen && (
        <MatchSetupWizard
          initial={match}
          onCancel={() => setWizardOpen(false)}
          onComplete={handleComplete}
        />
      )}
      {resetConfirmOpen && (
        <ConfirmDialog
          message={t('scoreboard.reset')}
          danger
          onConfirm={confirmReset}
          onCancel={() => setResetConfirmOpen(false)}
        />
      )}
      {resetChronoConfirmOpen && (
        <ConfirmDialog
          message={t('scoreboard.confirmResetChrono')}
          danger
          onConfirm={confirmResetChrono}
          onCancel={() => setResetChronoConfirmOpen(false)}
        />
      )}
    </>
  );
}

interface ScorePanelProps {
  background: string;
  textColor: string;
  ariaLabel: string;
  subtractLabel: string;
  onScore: () => void;
  onSubtract: () => void;
}

function ScorePanel({
  background,
  textColor,
  ariaLabel,
  subtractLabel,
  onScore,
  onSubtract,
}: ScorePanelProps) {
  const { isPressing, handlers } = useTapOrLongPress(onScore, onSubtract);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={`${ariaLabel} — ${subtractLabel}`}
      {...handlers}
      className="relative h-full w-full select-none text-left transition-[filter] duration-150 active:brightness-90"
      style={{
        background,
        color: textColor,
        touchAction: 'manipulation',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        filter: isPressing ? 'brightness(0.78)' : undefined,
      }}
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

  const baseTransform = `translate(${side === 'left' ? '-50%' : '50%'}, -50%)`;
  const label = atMatchPoint
    ? matchPointLabel
    : atSetPoint
      ? setPointLabel
      : '';

  return (
    <span
      aria-hidden
      key={`${score}-${locale}`}
      className={`pointer-events-none absolute z-[5] select-none font-medium leading-none text-white ${
        atMatchPoint ? 'mb-match-point-aura' : ''
      }`}
      style={{
        top: '50%',
        [side === 'left' ? 'left' : 'right']: `${SCORE_INSET_PCT}%`,
        transform: baseTransform,
        fontVariantNumeric: 'tabular-nums',
        fontSize: 'clamp(4.5rem, 20vw, 18rem)',
        letterSpacing: '-0.04em',
        textShadow: aura,
        borderRadius: '12%',
        padding: '0.05em',
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
        fontSize: 'clamp(3.25rem, 11vw, 8rem)',
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

  // Bottom plus haut que top : laisse passer la safe-area iOS + le footer.
  const positioning = {
    [position === 'top' ? 'top' : 'bottom']: position === 'top' ? '11%' : '16%',
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
        {label && <span className="truncate">{label}</span>}
        <span aria-hidden className="opacity-80">
          <ArrowUpDownIcon size={16} />
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
  onRematch: () => void;
  onBackHome: () => void;
  onShare: () => void;
  canShare: boolean;
}

function MatchOverOverlay({
  winnerLabel,
  setWins,
  setScores,
  onNewMatch,
  onRematch,
  onBackHome,
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
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-sm"
      style={{
        paddingInline: 'clamp(1rem, 4vw, 1.5rem)',
        paddingBlock: 'clamp(1rem, 4vw, 1.5rem)',
      }}
    >
      <div
        className="flex max-h-full max-w-md flex-col items-center gap-3 overflow-y-auto rounded-2xl border text-center shadow-2xl"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
          padding: 'clamp(1rem, 3.2vw, 1.75rem)',
          animation: 'mb-match-celebration 480ms ease-out',
        }}
      >
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--muted)' }}
        >
          {t('matchOver.label')}
        </p>
        <h2
          className="inline-flex items-center justify-center gap-2 break-words font-bold"
          style={{
            color: 'var(--primary)',
            fontSize: 'clamp(1.25rem, 4.5vw, 1.75rem)',
          }}
        >
          <TrophyIcon size={28} aria-hidden />
          <span>{t('matchOver.winnerText', { name: winnerLabel })}</span>
        </h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {t('matchOver.score', { a: setWins.team1, b: setWins.team2 })}
        </p>
        {setsLine && (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {t('matchOver.setsList', { sets: setsLine })}
          </p>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onRematch}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--primary)' }}
          >
            <RotateCwIcon size={16} />
            {t('matchOverExtra.rematch')}
          </button>
          <button
            type="button"
            onClick={onNewMatch}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold"
            style={{
              background: 'var(--surface-highlight)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <PencilIcon size={16} />
            {t('matchOver.newMatch')}
          </button>
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold"
            style={{
              background: 'var(--surface-highlight)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <HomeIcon size={16} />
            {t('matchOverExtra.backHome')}
          </button>
          {canShare && (
            <button
              type="button"
              onClick={onShare}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold"
              style={{
                background: 'var(--surface-highlight)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              <Share2Icon size={16} />
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
  pausedAt: number | null;
  totalPausedMs: number;
  onToggle: () => void;
  onReset: () => void;
  pauseLabel: string;
  resumeLabel: string;
  resetLabel: string;
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

function MatchDuration({
  startedAt,
  endedAt,
  pausedAt,
  totalPausedMs,
  onToggle,
  onReset,
  pauseLabel,
  resumeLabel,
  resetLabel,
}: MatchDurationProps) {
  const [now, setNow] = useState(() => Date.now());
  const isPaused = pausedAt !== null;
  const isFinished = endedAt !== null;
  const isRunning = !!startedAt && !isPaused && !isFinished;

  useEffect(() => {
    if (!isRunning) return;
    // Rafraîchit `now` immédiatement (sinon, à la reprise après pause,
    // la valeur reste périmée pendant max 1 s et l'écoulement affiché
    // est faussé jusqu'au prochain tick).
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  if (!startedAt) return null;
  const cursor = isFinished ? endedAt! : isPaused ? pausedAt! : now;
  const elapsed = cursor - startedAt - totalPausedMs;
  return (
    <span className="ml-2 inline-flex items-center gap-1">
      <span
        aria-live="off"
        className={`inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium tabular-nums ${isPaused ? 'opacity-60' : 'opacity-90'}`}
      >
        <span aria-hidden>⏱</span>
        {formatDuration(elapsed)}
      </span>
      {!isFinished && (
        <>
          <button
            type="button"
            onClick={onToggle}
            aria-label={isPaused ? resumeLabel : pauseLabel}
            title={isPaused ? resumeLabel : pauseLabel}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
          >
            {isPaused ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
          </button>
          <button
            type="button"
            onClick={onReset}
            aria-label={resetLabel}
            title={resetLabel}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
          >
            <TimerResetIcon size={14} />
          </button>
        </>
      )}
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
      className="pointer-events-none absolute z-[6] flex select-none items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-md sm:text-sm"
      style={{
        // Placé au-dessus des deux positions possibles du rond de service
        // (cy=55 ≈ 27% et cy=145 ≈ 64-72% selon le letterbox du court SVG),
        // juste sous le compteur de sets (top:18%).
        top: '25%',
        [side === 'left' ? 'left' : 'right']: `${SCORE_INSET_PCT}%`,
        transform: `translateX(${side === 'left' ? '-50%' : '50%'})`,
        background: 'rgba(0,0,0,0.55)',
      }}
    >
      <FlameIcon size={14} />
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
