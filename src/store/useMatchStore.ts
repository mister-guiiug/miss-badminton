import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  MatchConfig,
  PointsCap,
} from '../react/components/MatchSetupWizard';
import { storage, type SavedMatch } from '../storage';
import { ExportBundleSchema } from '../schemas';

export type ServiceSide = 'team1' | 'team2';

/**
 * Le délai d'annulation d'une suppression d'historique.
 *
 * ANNULER REMPLACE CONFIRMER. Supprimer une ligne d'historique ne demandait
 * rien et ne se rattrapait pas ; ça ne demande toujours rien, mais la ligne
 * ne quitte le stockage qu'à l'expiration de ce délai. Huit secondes : le
 * temps de lire « Match supprimé », de comprendre l'erreur et de viser
 * « Annuler », sans que le bandeau ne s'installe.
 *
 * `clearHistory` garde sa confirmation : effacer TOUT n'est pas le même
 * geste, et une seule annulation ne rendrait pas une décision de cette taille.
 */
export const UNDO_DELETE_MS = 8000;

/**
 * Le minuteur vit au niveau du module, pas dans un composant : quitter
 * l'écran Historique pendant le délai ne doit ni annuler la suppression ni
 * la figer en attente pour toujours.
 */
let undoTimer: ReturnType<typeof setTimeout> | null = null;

function clearUndoTimer(): void {
  if (undoTimer !== null) {
    clearTimeout(undoTimer);
    undoTimer = null;
  }
}

export interface HistoryEntry {
  score1: number;
  score2: number;
  setWins: { team1: number; team2: number };
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

export type FeedbackEvent = 'point' | 'setWon' | 'matchWon';

interface MatchState {
  // Config
  match: MatchConfig | null;

  // Active Game
  score1: number;
  score2: number;
  setWins: { team1: number; team2: number };
  matchWinner: ServiceSide | null;
  server: ServiceSide | null;
  setScores: { team1: number; team2: number }[];
  pendingSideChange: boolean;
  mid11Triggered: boolean;
  /**
   * Vrai entre l'instant où `closeCurrentSet` a renvoyé `'tie-break-required'`
   * et la résolution du point décisif. Le prochain `score(team)` ferme alors
   * le set immédiatement, indépendamment du seuil de points ou du cap.
   */
  pendingTieBreak: boolean;
  /**
   * Timestamp du premier point du set en cours. Sert à mesurer la durée
   * écoulée pour la limite de temps (`match.timeLimitMin`). `null` tant
   * qu'aucun point n'a été marqué dans le set courant.
   */
  currentSetStartedAt: number | null;
  startedAt: number | null;
  endedAt: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
  streak1: number;
  streak2: number;
  maxStreak1: number;
  maxStreak2: number;

  // UI / Transient state
  history: HistoryEntry[];
  pendingFeedback: FeedbackEvent | null;
  lastSetSummary: { winner: ServiceSide; a: number; b: number } | null;

  // Actions
  setMatch: (config: MatchConfig | null) => void;
  score: (team: ServiceSide) => void;
  subtract: (team: ServiceSide) => void;
  undo: () => void;
  swap: () => void;
  reset: () => void;
  restart: () => void;
  dismissSideChange: () => void;
  clearFeedback: () => void;
  clearSetSummary: () => void;
  pauseChrono: () => void;
  resumeChrono: () => void;
  resetChrono: () => void;

  /**
   * Ferme le set en cours sans qu'un seuil de score n'ait été atteint —
   * typiquement appelé par l'UI quand `match.timeLimitMin` est dépassé.
   * - Si les scores diffèrent : victoire au leader.
   * - Si égalité et `tieBreak === 'sudden-death'` : on n'écrit rien et on
   *   renvoie 'tie-break-required' ; l'UI doit demander un point décisif
   *   (qui passera par `score(team)`).
   * - Si égalité et tieBreak !== 'sudden-death' : aucun set attribué,
   *   on renvoie 'draw'.
   */
  closeCurrentSet: () =>
    | 'set-closed'
    | 'tie-break-required'
    | 'draw'
    | 'no-match';

  // History
  matchHistory: SavedMatch[];
  /**
   * Faux jusqu'à ce que l'hydratation IndexedDB ait fini (généralement
   * < 100 ms après le mount). Utile pour afficher un indicateur "Sync…"
   * dans HistoryView quand le cache localStorage est tronqué.
   */
  historyHydrated: boolean;
  saveToHistory: (match: SavedMatch) => void;
  editSetScore: (setIndex: number, team1: number, team2: number) => boolean;
  /**
   * Édite le score d'un set d'un match déjà terminé et persisté.
   * Recalcule `finalSetWins` et `winner` selon les sets résultants.
   * Renvoie `false` si le match est introuvable ou l'index hors borne.
   */
  editHistorySetScore: (
    matchId: string,
    setIndex: number,
    team1: number,
    team2: number
  ) => boolean;
  /** Suppression immédiate et définitive. Le chemin de l'UI est `requestRemoveFromHistory`. */
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;

  /**
   * La suppression en attente d'annulation. La ligne disparaît de l'écran
   * tout de suite, mais rien n'est encore écrit : le stockage n'est touché
   * qu'à l'expiration (`commitPendingRemoval`).
   */
  pendingDeletion: { id: string; expiresAt: number } | null;
  /** Amorce la suppression annulable et arme le minuteur. */
  requestRemoveFromHistory: (id: string) => void;
  /** L'utilisateur a cliqué « Annuler » : rien n'aura été écrit. */
  undoPendingRemoval: () => void;
  /** Le délai a filé (ou un autre geste passe devant) : on écrit. */
  commitPendingRemoval: () => void;

  /**
   * Importe un blob d'export (Settings) validé via zod. Renvoie le détail
   * de ce qui a été appliqué ou un message d'erreur si la donnée est
   * structurellement invalide.
   */
  importBundle: (raw: unknown) => {
    ok: boolean;
    error?: string;
    applied?: {
      history: number;
      players: number;
      settings: boolean;
    };
  };
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

function maxTotalSets(setsToWin: number): number {
  return 2 * setsToWin - 1;
}

function flipSide(side: ServiceSide | null): ServiceSide | null {
  if (side === 'team1') return 'team2';
  if (side === 'team2') return 'team1';
  return null;
}

export const useMatchStore = create<MatchState>()(
  persist(
    (set, get) => ({
      match: null,
      score1: 0,
      score2: 0,
      setWins: { team1: 0, team2: 0 },
      matchWinner: null,
      server: null,
      setScores: [],
      pendingSideChange: false,
      mid11Triggered: false,
      pendingTieBreak: false,
      currentSetStartedAt: null,
      startedAt: null,
      endedAt: null,
      pausedAt: null,
      totalPausedMs: 0,
      streak1: 0,
      streak2: 0,
      maxStreak1: 0,
      maxStreak2: 0,
      history: [],
      pendingFeedback: null,
      lastSetSummary: null,
      matchHistory: storage.loadHistory(),
      historyHydrated: false,
      pendingDeletion: null,

      setMatch: config => set({ match: config, history: [] }),

      score: team => {
        const state = get();
        if (state.matchWinner || !state.match) return;

        const now = Date.now();
        const nextS1 = team === 'team1' ? state.score1 + 1 : state.score1;
        const nextS2 = team === 'team2' ? state.score2 + 1 : state.score2;

        // Sudden death : un point déclenché par `closeCurrentSet` à l'épuisement
        // du temps. Ce point ferme le set immédiatement, indépendamment du
        // seuil de points ou du cap.
        const team1Won = state.pendingTieBreak
          ? team === 'team1'
          : isSetWon(nextS1, nextS2, state.match.points, state.match.cap);
        const team2Won = state.pendingTieBreak
          ? team === 'team2'
          : isSetWon(nextS2, nextS1, state.match.points, state.match.cap);
        const setEnded = team1Won || team2Won;

        const baseHistory: HistoryEntry = {
          score1: state.score1,
          score2: state.score2,
          setWins: state.setWins,
          server: state.server,
          team: team,
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

        const startedAt = state.startedAt ?? now;
        const nextStreak1 = team === 'team1' ? state.streak1 + 1 : 0;
        const nextStreak2 = team === 'team2' ? state.streak2 + 1 : 0;
        const nextMaxStreak1 = Math.max(state.maxStreak1, nextStreak1);
        const nextMaxStreak2 = Math.max(state.maxStreak2, nextStreak2);

        if (setEnded) {
          const winnerSide: ServiceSide = team1Won ? 'team1' : 'team2';
          const nextSetWins = {
            team1: state.setWins.team1 + (team1Won ? 1 : 0),
            team2: state.setWins.team2 + (team2Won ? 1 : 0),
          };
          const matchEnded = nextSetWins[winnerSide] >= state.match.sets;
          const nextSetScores = [
            ...state.setScores,
            { team1: nextS1, team2: nextS2 },
          ];
          const totalSetsPlayed = nextSetWins.team1 + nextSetWins.team2;
          const isDecidingNext =
            !matchEnded &&
            Math.max(nextSetWins.team1, nextSetWins.team2) ===
              state.match.sets - 1 &&
            totalSetsPlayed === maxTotalSets(state.match.sets) - 1;

          let pendingSideChange = false;
          if (!matchEnded) {
            if (state.match.sideChange === 'each-set') pendingSideChange = true;
            else if (state.match.sideChange === 'decisive' && isDecidingNext)
              pendingSideChange = true;
          }

          set({
            score1: 0,
            score2: 0,
            server: null,
            setWins: nextSetWins,
            matchWinner: matchEnded ? winnerSide : null,
            setScores: nextSetScores,
            pendingSideChange,
            mid11Triggered: false,
            pendingTieBreak: false,
            currentSetStartedAt: null,
            history: [...state.history, { ...baseHistory, matchEnded }],
            pendingFeedback: matchEnded ? 'matchWon' : 'setWon',
            lastSetSummary: {
              winner: winnerSide,
              a: nextS1,
              b: nextS2,
            },
            startedAt,
            endedAt: matchEnded ? now : null,
            streak1: 0,
            streak2: 0,
            maxStreak1: nextMaxStreak1,
            maxStreak2: nextMaxStreak2,
          });
          return;
        }

        let pendingSideChange = state.pendingSideChange;
        let mid11Triggered = state.mid11Triggered;
        if (
          state.match.sideChange === 'mid-match' &&
          !mid11Triggered &&
          (nextS1 === 11 || nextS2 === 11)
        ) {
          pendingSideChange = true;
          mid11Triggered = true;
        }

        set({
          score1: nextS1,
          score2: nextS2,
          server: team,
          pendingSideChange,
          mid11Triggered,
          // Le set démarre au premier point ; les suivants conservent la
          // valeur (qui sert de référence pour la limite de temps).
          currentSetStartedAt: state.currentSetStartedAt ?? now,
          history: [...state.history, baseHistory],
          pendingFeedback: 'point',
          lastSetSummary: null,
          startedAt,
          streak1: nextStreak1,
          streak2: nextStreak2,
          maxStreak1: nextMaxStreak1,
          maxStreak2: nextMaxStreak2,
        });
      },

      subtract: team => {
        const state = get();
        if (state.matchWinner) return;
        const cur = team === 'team1' ? state.score1 : state.score2;
        if (cur <= 0) return;

        const nextS1 = team === 'team1' ? state.score1 - 1 : state.score1;
        const nextS2 = team === 'team2' ? state.score2 - 1 : state.score2;

        const baseHistory: HistoryEntry = {
          score1: state.score1,
          score2: state.score2,
          setWins: state.setWins,
          server: state.server,
          team: team,
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

        set({
          score1: nextS1,
          score2: nextS2,
          history: [...state.history, baseHistory],
          pendingFeedback: 'point',
          streak1: team === 'team1' ? 0 : state.streak1,
          streak2: team === 'team2' ? 0 : state.streak2,
        });
      },

      undo: () => {
        const state = get();
        const last = state.history.at(-1);
        if (!last) return;
        set({
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
        });
      },

      swap: () => {
        const state = get();
        if (!state.match) return;
        set({
          match: {
            ...state.match,
            team1: state.match.team2,
            team2: state.match.team1,
          },
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
          history: [],
          lastSetSummary: state.lastSetSummary
            ? {
                winner: flipSide(state.lastSetSummary.winner) ?? 'team1',
                a: state.lastSetSummary.b,
                b: state.lastSetSummary.a,
              }
            : null,
          streak1: state.streak2,
          streak2: state.streak1,
          maxStreak1: state.maxStreak2,
          maxStreak2: state.maxStreak1,
        });
      },

      reset: () =>
        set({
          score1: 0,
          score2: 0,
          setWins: { team1: 0, team2: 0 },
          matchWinner: null,
          server: null,
          setScores: [],
          pendingSideChange: false,
          mid11Triggered: false,
          pendingTieBreak: false,
          currentSetStartedAt: null,
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
        }),

      restart: () => {
        get().reset();
      },

      dismissSideChange: () => set({ pendingSideChange: false }),
      clearFeedback: () => set({ pendingFeedback: null }),
      clearSetSummary: () => set({ lastSetSummary: null }),

      pauseChrono: () => {
        const state = get();
        if (
          state.pausedAt !== null ||
          state.startedAt === null ||
          state.endedAt !== null
        )
          return;
        set({ pausedAt: Date.now() });
      },

      resumeChrono: () => {
        const state = get();
        if (state.pausedAt === null) return;
        const now = Date.now();
        const pausedDuration = now - state.pausedAt;
        set({
          pausedAt: null,
          totalPausedMs: state.totalPausedMs + Math.max(0, pausedDuration),
        });
      },

      resetChrono: () => {
        const state = get();
        const now = Date.now();
        set({
          startedAt: state.startedAt === null ? null : now,
          totalPausedMs: 0,
          pausedAt: state.pausedAt === null ? null : now,
        });
      },

      closeCurrentSet: () => {
        const state = get();
        if (!state.match || state.matchWinner) return 'no-match';
        // Idempotence : si le set a déjà été clôturé (par le score normal,
        // par un appel précédent à closeCurrentSet, ou parce que le set
        // n'a même pas démarré), on ne fait rien.
        if (
          state.currentSetStartedAt === null &&
          state.score1 === 0 &&
          state.score2 === 0
        ) {
          return 'no-match';
        }
        if (state.score1 === state.score2) {
          if (state.match.tieBreak === 'sudden-death') {
            // Pas d'effet si déjà armé.
            if (!state.pendingTieBreak) set({ pendingTieBreak: true });
            return 'tie-break-required';
          }
          return 'draw';
        }
        const winnerSide: ServiceSide =
          state.score1 > state.score2 ? 'team1' : 'team2';
        const nextSetWins = {
          team1: state.setWins.team1 + (winnerSide === 'team1' ? 1 : 0),
          team2: state.setWins.team2 + (winnerSide === 'team2' ? 1 : 0),
        };
        const matchEnded = nextSetWins[winnerSide] >= state.match.sets;
        const nextSetScores = [
          ...state.setScores,
          { team1: state.score1, team2: state.score2 },
        ];
        const now = Date.now();
        set({
          score1: 0,
          score2: 0,
          server: null,
          setWins: nextSetWins,
          matchWinner: matchEnded ? winnerSide : null,
          setScores: nextSetScores,
          pendingSideChange: false,
          mid11Triggered: false,
          pendingTieBreak: false,
          currentSetStartedAt: null,
          history: [],
          pendingFeedback: matchEnded ? 'matchWon' : 'setWon',
          lastSetSummary: {
            winner: winnerSide,
            a: state.score1,
            b: state.score2,
          },
          endedAt: matchEnded ? now : null,
        });
        return 'set-closed';
      },

      saveToHistory: match => {
        const history = get().matchHistory;
        if (history.some(m => m.id === match.id)) return;
        // `storage.saveMatchToHistory` applique le plafond MAX_HISTORY ;
        // on re-lit ensuite l'historique pour rester en cohérence avec
        // ce qui est réellement persisté (source de vérité = localStorage).
        storage.saveMatchToHistory(match);
        set({ matchHistory: storage.loadHistory() });
      },

      editSetScore: (setIndex, t1, t2) => {
        const state = get();
        if (!state.match) return false;
        if (setIndex < 0 || setIndex >= state.setScores.length) return false;
        if (t1 < 0 || t2 < 0) return false;
        const next = state.setScores.map((s, i) =>
          i === setIndex ? { team1: t1, team2: t2 } : s
        );
        // Recalcule setWins en repassant sur la liste : on suppose qu'à
        // chaque set, le gagnant est celui qui a le plus grand score (le
        // wizard valide déjà les seuils ; l'édition se fait après la fin
        // d'un set donc les scores sont supposés conformes).
        const setWins = { team1: 0, team2: 0 };
        for (const s of next) {
          if (s.team1 > s.team2) setWins.team1 += 1;
          else if (s.team2 > s.team1) setWins.team2 += 1;
        }
        const winner =
          setWins.team1 >= state.match.sets
            ? ('team1' as const)
            : setWins.team2 >= state.match.sets
              ? ('team2' as const)
              : null;
        set({ setScores: next, setWins, matchWinner: winner });
        return true;
      },

      editHistorySetScore: (matchId, setIndex, t1, t2) => {
        if (t1 < 0 || t2 < 0) return false;
        const history = get().matchHistory;
        const match = history.find(m => m.id === matchId);
        if (!match) return false;
        if (setIndex < 0 || setIndex >= match.setScores.length) return false;
        const nextSetScores = match.setScores.map((s, i) =>
          i === setIndex ? { team1: t1, team2: t2 } : s
        );
        const finalSetWins = { team1: 0, team2: 0 };
        for (const s of nextSetScores) {
          if (s.team1 > s.team2) finalSetWins.team1 += 1;
          else if (s.team2 > s.team1) finalSetWins.team2 += 1;
        }
        const winner: 'team1' | 'team2' =
          finalSetWins.team1 >= finalSetWins.team2 ? 'team1' : 'team2';
        const updated: SavedMatch = {
          ...match,
          setScores: nextSetScores,
          finalSetWins,
          winner,
        };
        // Remplacement atomique : on rebâtit la liste persistée puis on
        // re-synchronise l'état Zustand depuis le storage (source de vérité).
        const nextHistory = history.map(m => (m.id === matchId ? updated : m));
        storage.replaceHistory(nextHistory);
        set({ matchHistory: storage.loadHistory() });
        return true;
      },

      removeFromHistory: id => {
        storage.removeMatchFromHistory(id);
        // On filtre la liste en mémoire au lieu de relire `storage` : la
        // relecture rend la copie plafonnée à 200 matchs et tronquerait
        // l'historique complet hydraté depuis IndexedDB.
        set({ matchHistory: get().matchHistory.filter(m => m.id !== id) });
      },

      clearHistory: () => {
        clearUndoTimer();
        storage.clearHistory();
        set({ matchHistory: [], pendingDeletion: null });
      },

      requestRemoveFromHistory: id => {
        const state = get();
        if (!state.matchHistory.some(m => m.id === id)) return;
        // Une seconde suppression valide la première : le bandeau ne parle
        // que du dernier geste, et empiler deux annulations derrière un seul
        // bouton mentirait sur ce qu'« Annuler » veut dire.
        if (state.pendingDeletion) get().commitPendingRemoval();
        clearUndoTimer();
        undoTimer = setTimeout(() => {
          useMatchStore.getState().commitPendingRemoval();
        }, UNDO_DELETE_MS);
        set({
          pendingDeletion: { id, expiresAt: Date.now() + UNDO_DELETE_MS },
        });
      },

      undoPendingRemoval: () => {
        clearUndoTimer();
        // Rien à restaurer : rien n'a été écrit. C'est tout l'intérêt.
        set({ pendingDeletion: null });
      },

      commitPendingRemoval: () => {
        const pending = get().pendingDeletion;
        clearUndoTimer();
        if (!pending) return;
        storage.removeMatchFromHistory(pending.id);
        set({
          matchHistory: get().matchHistory.filter(m => m.id !== pending.id),
          pendingDeletion: null,
        });
      },

      importBundle: raw => {
        const parsed = ExportBundleSchema.safeParse(raw);
        if (!parsed.success) {
          return { ok: false, error: 'invalid_format' };
        }
        const data = parsed.data;
        let historyCount = 0;
        let playersCount = 0;
        let settingsApplied = false;
        if (data.history) {
          const ok = storage.replaceHistory(data.history);
          if (ok) {
            historyCount = data.history.length;
            set({ matchHistory: storage.loadHistory() });
          }
        }
        if (data.players) {
          storage.replacePlayerNames(data.players);
          playersCount = data.players.length;
        }
        if (data.settings) {
          // L'application effective des réglages reste à la charge du caller
          // (theme, locale, couleurs, sound, haptic) car ils vivent dans des
          // hooks séparés. Le store se contente de valider le bundle.
          settingsApplied = true;
        }
        return {
          ok: true,
          applied: {
            history: historyCount,
            players: playersCount,
            settings: settingsApplied,
          },
        };
      },
    }),
    {
      name: 'mb-match-storage',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: state => ({
        match: state.match,
        score1: state.score1,
        score2: state.score2,
        setWins: state.setWins,
        matchWinner: state.matchWinner,
        server: state.server,
        setScores: state.setScores,
        pendingSideChange: state.pendingSideChange,
        mid11Triggered: state.mid11Triggered,
        pendingTieBreak: state.pendingTieBreak,
        currentSetStartedAt: state.currentSetStartedAt,
        startedAt: state.startedAt,
        endedAt: state.endedAt,
        pausedAt: state.pausedAt,
        totalPausedMs: state.totalPausedMs,
        streak1: state.streak1,
        streak2: state.streak2,
        maxStreak1: state.maxStreak1,
        maxStreak2: state.maxStreak2,
      }),
    }
  )
);

// Hydratation asynchrone de l'historique depuis IndexedDB. À l'init, le
// store contient déjà la copie cache (localStorage, plafonnée). Une fois
// IDB résolu, on remplace par la version complète non plafonnée. En
// environnement non-browser (SSR, tests sans jsdom IDB), `loadHistoryAsync`
// retombe sur le cache localStorage — pas d'effet de bord.
if (typeof window !== 'undefined') {
  void storage.loadHistoryAsync().then(history => {
    const current = useMatchStore.getState().matchHistory;
    // Évite un setState inutile si rien n'a changé.
    if (
      history.length !== current.length ||
      history.some((m, i) => m.id !== current[i]?.id)
    ) {
      useMatchStore.setState({ matchHistory: history, historyHydrated: true });
    } else {
      useMatchStore.setState({ historyHydrated: true });
    }
  });
}
