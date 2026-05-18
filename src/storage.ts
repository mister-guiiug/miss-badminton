import type { MatchConfig } from './react/components/MatchSetupWizard';

const LS = {
  match: 'mb_active_match',
  game: 'mb_active_game',
  history: 'mb_match_history',
  players: 'mb_player_names',
  sound: 'mb_sound_enabled',
  haptic: 'mb_haptic_enabled',
  dataVersion: 'mb_data_version',
} as const;

const MAX_PLAYERS = 24;
const MAX_HISTORY = 50;

/**
 * Bump when the shape/sémantique des données persistées change de façon
 * non rétrocompatible. La migration efface les stores impactés au prochain
 * chargement.
 *
 * v2 (2026-05): `MatchConfig.sets` représente désormais le nombre de sets
 * gagnants nécessaires (et non plus le total à jouer). Les valeurs stockées
 * avant cette version seraient interprétées à l'envers, donc on wipe.
 */
const CURRENT_DATA_VERSION = '2';

export interface PersistedGameState {
  score1: number;
  score2: number;
  setWins: { team1: number; team2: number };
  matchWinner: 'team1' | 'team2' | null;
  server: 'team1' | 'team2' | null;
  setScores: { team1: number; team2: number }[];
  pendingSideChange: boolean;
  mid11Triggered: boolean;
  startedAt: number | null;
  endedAt: number | null;
  pausedAt?: number | null;
  totalPausedMs?: number;
  streak1: number;
  streak2: number;
  maxStreak1: number;
  maxStreak2: number;
}

export interface SavedMatch {
  id: string;
  completedAt: number;
  config: MatchConfig;
  setScores: { team1: number; team2: number }[];
  finalSetWins: { team1: number; team2: number };
  winner: 'team1' | 'team2';
  durationMs?: number;
  maxStreak?: { team1: number; team2: number };
}

function safeRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage full or unavailable */
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function runMigrations(): void {
  try {
    const stored = localStorage.getItem(LS.dataVersion);
    if (stored === CURRENT_DATA_VERSION) return;
    safeRemove(LS.match);
    safeRemove(LS.game);
    safeRemove(LS.history);
    localStorage.setItem(LS.dataVersion, CURRENT_DATA_VERSION);
  } catch {
    /* localStorage unavailable — pas de migration nécessaire */
  }
}

runMigrations();

export const storage = {
  loadActiveMatch: (): MatchConfig | null => safeRead<MatchConfig>(LS.match),
  saveActiveMatch: (m: MatchConfig | null): void => {
    if (m) safeWrite(LS.match, m);
    else safeRemove(LS.match);
  },

  loadActiveGame: (): PersistedGameState | null =>
    safeRead<PersistedGameState>(LS.game),
  saveActiveGame: (g: PersistedGameState | null): void => {
    if (g) safeWrite(LS.game, g);
    else safeRemove(LS.game);
  },

  loadPlayerNames: (): string[] => safeRead<string[]>(LS.players) ?? [],
  addPlayerName: (name: string): void => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = storage.loadPlayerNames();
    const next = [trimmed, ...current.filter(n => n !== trimmed)].slice(
      0,
      MAX_PLAYERS
    );
    safeWrite(LS.players, next);
  },
  removePlayerName: (name: string): void => {
    const current = storage.loadPlayerNames();
    const next = current.filter(n => n !== name);
    safeWrite(LS.players, next);
  },

  loadHistory: (): SavedMatch[] => safeRead<SavedMatch[]>(LS.history) ?? [],
  saveMatchToHistory: (m: SavedMatch): void => {
    const current = storage.loadHistory();
    if (current.some(x => x.id === m.id)) return;
    const next = [m, ...current].slice(0, MAX_HISTORY);
    safeWrite(LS.history, next);
  },
  removeMatchFromHistory: (id: string): void => {
    const next = storage.loadHistory().filter(m => m.id !== id);
    safeWrite(LS.history, next);
  },
  clearHistory: (): void => safeRemove(LS.history),

  loadBoolPref: (key: 'sound' | 'haptic', fallback: boolean): boolean => {
    const v = safeRead<boolean>(LS[key]);
    return v == null ? fallback : v;
  },
  saveBoolPref: (key: 'sound' | 'haptic', value: boolean): void =>
    safeWrite(LS[key], value),

  /**
   * "Replay" temporaire : un MatchConfig à pré-remplir au prochain rendu
   * de HomeView. Stocké en sessionStorage (durée de l'onglet).
   */
  setPendingReplay: (config: MatchConfig): void => {
    try {
      sessionStorage.setItem('mb_pending_replay', JSON.stringify(config));
    } catch {
      /* ignore */
    }
  },
  consumePendingReplay: (): MatchConfig | null => {
    try {
      const raw = sessionStorage.getItem('mb_pending_replay');
      if (!raw) return null;
      sessionStorage.removeItem('mb_pending_replay');
      return JSON.parse(raw) as MatchConfig;
    } catch {
      return null;
    }
  },
};
