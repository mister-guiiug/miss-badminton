import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  MatchConfig,
  PointsCap,
} from '../react/components/MatchSetupWizard';
import { storage, type SavedMatch } from '../storage';
import { ExportBundleSchema } from '../schemas';

export type ServiceSide = 'team1' | 'team2';

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

  // History
  matchHistory: SavedMatch[];
  saveToHistory: (match: SavedMatch) => void;
  editSetScore: (
    setIndex: number,
    team1: number,
    team2: number
  ) => boolean;
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
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;

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

      setMatch: config => set({ match: config, history: [] }),

      score: team => {
        const state = get();
        if (state.matchWinner || !state.match) return;

        const now = Date.now();
        const nextS1 = team === 'team1' ? state.score1 + 1 : state.score1;
        const nextS2 = team === 'team2' ? state.score2 + 1 : state.score2;

        const team1Won = isSetWon(
          nextS1,
          nextS2,
          state.match.points,
          state.match.cap
        );
        const team2Won = isSetWon(
          nextS2,
          nextS1,
          state.match.points,
          state.match.cap
        );
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
        if (state.history.length === 0) return;
        const last = state.history[state.history.length - 1];
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
        const nextHistory = history.map(m =>
          m.id === matchId ? updated : m
        );
        storage.replaceHistory(nextHistory);
        set({ matchHistory: storage.loadHistory() });
        return true;
      },

      removeFromHistory: id => {
        storage.removeMatchFromHistory(id);
        set({ matchHistory: storage.loadHistory() });
      },

      clearHistory: () => {
        storage.clearHistory();
        set({ matchHistory: [] });
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
