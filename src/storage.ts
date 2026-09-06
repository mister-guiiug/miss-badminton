import type { MatchConfig } from './react/components/MatchSetupWizard';
import {
  MatchConfigSchema,
  MatchTemplateArraySchema,
  PersistedGameStateSchema,
  PlayerArraySchema,
  PlayerNamesSchema,
  SavedMatchArraySchema,
  type MatchTemplate,
  type Player,
  type SavedMatch,
} from './schemas';
import {
  migratePlayers,
  normalizeName,
  playerKey,
  renameInMatches,
  upsertPlayer,
} from './players';
import type { z } from 'zod';
import { createIdb } from '@mister-guiiug/dev-pwa-config/idb';

/**
 * IndexedDB via le socle — source de vérité pour l'historique complet (sans
 * plafond), pendant que localStorage conserve une copie plafonnée à
 * `MAX_HISTORY` pour la lecture synchrone à l'init du store.
 *
 * Compat : même identité que l'ancien wrapper local `src/idb.ts` (supprimé) —
 * base `miss-badminton`, version 1, object-store `kv` — donc la base des
 * utilisateurs existants s'ouvre telle quelle, sans migration. Seul écart :
 * cette base héritée n'a pas de store `blobs` (créé uniquement à la création
 * d'une base neuve) ; les API blob du socle s'y replient sans lever, et l'app
 * ne les utilise pas. Voir `storage.test.ts`.
 */
const idb = createIdb('miss-badminton');

const LS = {
  match: 'mb_active_match',
  game: 'mb_active_game',
  history: 'mb_match_history',
  /** Format hérité : la liste de NOMS d'avant les profils. */
  legacyPlayers: 'mb_player_names',
  /** Les profils joueurs (`players.ts`). */
  players: 'mb_players',
  /** Marqueur de la migration noms → profils, indépendant de `dataVersion`. */
  playersVersion: 'mb_players_version',
  templates: 'mb_match_templates',
  sound: 'mb_sound_enabled',
  haptic: 'mb_haptic_enabled',
  dataVersion: 'mb_data_version',
} as const;

/**
 * Plafond du registre des joueurs. L'ancienne liste de noms plafonnait à 24
 * — c'était une liste de SUGGESTIONS, la tronquer ne coûtait qu'une frappe.
 * Un profil est maintenant une identité que l'historique désigne : le perdre
 * coûte la possibilité de renommer ce joueur et de filtrer sur lui. D'où un
 * plafond qui ne peut pas mordre en pratique, gardé uniquement pour qu'une
 * donnée aberrante ne remplisse pas `localStorage`.
 */
const MAX_PLAYERS = 200;
const MAX_HISTORY = 200;
const MAX_TEMPLATES = 12;

/**
 * Bump when the shape/sémantique des données persistées change de façon
 * non rétrocompatible. La migration efface les stores impactés au prochain
 * chargement, après avoir sauvegardé une copie dans `mb_backup_v{n}`.
 *
 * v2 (2026-05): `MatchConfig.sets` représente désormais le nombre de sets
 * gagnants nécessaires (et non plus le total à jouer). Les valeurs stockées
 * avant cette version seraient interprétées à l'envers, donc on wipe.
 * v3 (2026-05): introduction de la validation zod runtime ; on bump non pas
 * parce que le format change, mais pour repartir d'un état propre validé.
 *   → en pratique pas de wipe forcé, on s'appuie sur safeRead pour ignorer
 *   les données qui ne passent pas la validation.
 */
const CURRENT_DATA_VERSION = '2';

/**
 * Version du registre des joueurs — DÉLIBÉRÉMENT séparée de
 * `CURRENT_DATA_VERSION`.
 *
 * Bumper `mb_data_version` déclenche `runMigrations`, qui SAUVEGARDE PUIS
 * EFFACE l'historique. Passer des noms aux profils n'efface rien : c'est une
 * transformation additive (on pose des identifiants sur des matchs qu'on
 * garde). Elle a donc son propre marqueur, sous sa propre clé, et le
 * mécanisme existant reste ce qu'il est.
 */
const PLAYERS_VERSION = '1';

export type PersistedGameState = z.infer<typeof PersistedGameStateSchema>;
export type { Player, SavedMatch } from './schemas';

function safeReadValidated<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T | null = null
): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    const result = schema.safeParse(parsed);
    if (!result.success) {
      // Donnée invalide — on n'écrase pas l'utilisateur silencieusement :
      // on conserve la donnée brute en backup pour récupération manuelle.
      try {
        const backupKey = `${key}_invalid_${Date.now()}`;
        localStorage.setItem(backupKey, raw);
      } catch {
        /* localStorage plein — tant pis */
      }
      return fallback;
    }
    return result.data;
  } catch {
    return fallback;
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

function backupAndRemove(key: string, version: string): void {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      localStorage.setItem(`mb_backup_v${version}_${key}`, raw);
    }
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function runMigrations(): void {
  try {
    const stored = localStorage.getItem(LS.dataVersion);
    if (stored === CURRENT_DATA_VERSION) return;
    // Avant de wipe, on conserve une copie horodatée — l'utilisateur peut
    // toujours récupérer ses données via la console si une migration
    // automatique se révèle malheureuse.
    const previousVersion = stored ?? '1';
    backupAndRemove(LS.match, previousVersion);
    backupAndRemove(LS.game, previousVersion);
    backupAndRemove(LS.history, previousVersion);
    localStorage.setItem(LS.dataVersion, CURRENT_DATA_VERSION);
  } catch {
    /* localStorage unavailable — pas de migration nécessaire */
  }
}

/**
 * La migration noms → profils, jouée une fois, à la lecture synchrone.
 *
 * Elle ne voit ici que la copie plafonnée de `localStorage` (200 matchs) :
 * l'historique complet vit dans IndexedDB et n'est lisible qu'en asynchrone.
 * `loadHistoryAsync` rejoue donc la même migration sur la version complète —
 * elle est additive, donc rejouable sans dupliquer un profil.
 *
 * Rien n'est effacé : l'ancienne liste de noms part en sauvegarde
 * (`mb_backup_vplayers_mb_player_names`) avant d'être retirée, comme le fait
 * déjà `backupAndRemove` pour les bumps de version.
 */
function runPlayersMigration(): void {
  try {
    if (localStorage.getItem(LS.playersVersion) === PLAYERS_VERSION) return;
    const legacyNames =
      safeReadValidated(LS.legacyPlayers, PlayerNamesSchema, []) ?? [];
    const known = safeReadValidated(LS.players, PlayerArraySchema, []) ?? [];
    const history =
      safeReadValidated(LS.history, SavedMatchArraySchema, []) ?? [];
    const result = migratePlayers(history, {
      knownPlayers: known,
      legacyNames,
    });
    safeWrite(LS.players, result.players.slice(0, MAX_PLAYERS));
    if (result.changed) {
      safeWrite(LS.history, result.matches.slice(0, MAX_HISTORY));
    }
    backupAndRemove(LS.legacyPlayers, 'players');
    localStorage.setItem(LS.playersVersion, PLAYERS_VERSION);
  } catch {
    /* localStorage indisponible — la migration se rejouera au prochain accès */
  }
}

runMigrations();
runPlayersMigration();

export const storage = {
  loadActiveMatch: (): MatchConfig | null =>
    safeReadValidated(LS.match, MatchConfigSchema) as MatchConfig | null,
  saveActiveMatch: (m: MatchConfig | null): void => {
    if (m) safeWrite(LS.match, m);
    else safeRemove(LS.match);
  },

  loadActiveGame: (): PersistedGameState | null =>
    safeReadValidated(LS.game, PersistedGameStateSchema),
  saveActiveGame: (g: PersistedGameState | null): void => {
    if (g) safeWrite(LS.game, g);
    else safeRemove(LS.game);
  },

  /** Le registre des profils, du plus récemment créé au plus ancien. */
  loadPlayers: (): Player[] =>
    safeReadValidated(LS.players, PlayerArraySchema, []) ?? [],
  savePlayers: (players: Player[]): void => {
    safeWrite(LS.players, players.slice(0, MAX_PLAYERS));
  },
  /** Les noms seuls — pour l'autocomplétion et l'export lisible par l'ancien. */
  loadPlayerNames: (): string[] => storage.loadPlayers().map(p => p.name),
  /**
   * Rend le profil de ce nom, en le créant au besoin. C'est le point d'entrée
   * du wizard : un nom saisi devient un joueur, et le match qui suit portera
   * son identifiant.
   */
  rememberPlayer: (name: string): Player | null => {
    if (!normalizeName(name)) return null;
    const result = upsertPlayer(storage.loadPlayers(), name);
    if (result.changed) storage.savePlayers(result.players);
    return result.player;
  },
  removePlayer: (id: string): void => {
    storage.savePlayers(storage.loadPlayers().filter(p => p.id !== id));
  },
  /**
   * Renomme un profil. L'historique suit : le registre fait foi à
   * l'affichage, et le nom recopié dans chaque match est réécrit pour que
   * l'export reste juste. Refuse un nom vide ou déjà porté par un autre
   * profil — une fusion silencieuse serait bien plus dure à défaire qu'un
   * refus.
   */
  renamePlayer: (
    id: string,
    name: string
  ): 'ok' | 'empty' | 'unknown' | 'duplicate' => {
    const clean = normalizeName(name);
    if (!clean) return 'empty';
    const players = storage.loadPlayers();
    if (!players.some(p => p.id === id)) return 'unknown';
    const key = playerKey(clean);
    if (players.some(p => p.id !== id && playerKey(p.name) === key)) {
      return 'duplicate';
    }
    storage.savePlayers(
      players.map(p => (p.id === id ? { ...p, name: clean } : p))
    );
    const local = renameInMatches(storage.loadHistory(), id, clean);
    if (local.changed) safeWrite(LS.history, local.matches);
    void idb.get('history').then(raw => {
      const parsed = SavedMatchArraySchema.safeParse(raw ?? []);
      if (!parsed.success) return;
      const full = renameInMatches(parsed.data, id, clean);
      if (full.changed) void idb.set('history', full.matches);
    });
    return 'ok';
  },
  replacePlayers: (players: unknown): boolean => {
    const result = PlayerArraySchema.safeParse(players);
    if (!result.success) return false;
    storage.savePlayers(result.data);
    return true;
  },
  /**
   * Joue la migration des profils sur un historique quelconque — celui
   * d'IndexedDB à l'hydratation, celui d'un fichier importé — et persiste ce
   * qu'elle a découvert. Rend l'historique estampillé.
   */
  absorbHistory: (matches: SavedMatch[]): SavedMatch[] => {
    const result = migratePlayers(matches, {
      knownPlayers: storage.loadPlayers(),
    });
    if (!result.changed) return matches;
    storage.savePlayers(result.players);
    return result.matches;
  },

  /**
   * Lecture synchrone — renvoie la copie cache en localStorage (plafonnée
   * à `MAX_HISTORY`). `loadHistoryAsync` complète plus tard avec la version
   * complète depuis IndexedDB.
   */
  loadHistory: (): SavedMatch[] =>
    safeReadValidated(LS.history, SavedMatchArraySchema, []) ?? [],
  /**
   * Lecture async depuis IndexedDB (source de vérité, non plafonnée).
   * Effectue une migration one-shot localStorage → IDB si IDB est vide.
   */
  loadHistoryAsync: async (): Promise<SavedMatch[]> => {
    const raw = await idb.get('history');
    if (raw !== undefined) {
      const result = SavedMatchArraySchema.safeParse(raw);
      if (result.success) {
        // C'est ICI que la migration des profils voit l'historique COMPLET :
        // la passe synchrone n'a lu que la copie plafonnée à 200 matchs, donc
        // un joueur qui n'apparaît qu'au 201e match n'aurait jamais eu de
        // profil. La migration est additive, la rejouer ne duplique rien.
        const absorbed = storage.absorbHistory(result.data);
        if (absorbed !== result.data) {
          await idb.set('history', absorbed);
          safeWrite(LS.history, absorbed.slice(0, MAX_HISTORY));
        }
        return absorbed;
      }
    }
    // IDB vide : seed depuis localStorage si présent (migration douce).
    const fromLs = storage.loadHistory();
    if (fromLs.length > 0) {
      await idb.set('history', fromLs);
    }
    return fromLs;
  },
  saveMatchToHistory: (m: SavedMatch): void => {
    const current = storage.loadHistory();
    if (current.some(x => x.id === m.id)) return;
    const next = [m, ...current];
    // localStorage : cache plafonné pour la lecture synchrone d'init.
    safeWrite(LS.history, next.slice(0, MAX_HISTORY));
    // IDB : source de vérité non plafonnée. On lit l'état IDB, on insère
    // en tête, et on ré-écrit. Le `void` est volontaire — l'UI ne doit pas
    // attendre l'IDB pour répondre.
    void idb.get('history').then(raw => {
      const parsed = SavedMatchArraySchema.safeParse(raw ?? []);
      const base: SavedMatch[] = parsed.success ? parsed.data : [];
      if (base.some(x => x.id === m.id)) return;
      void idb.set('history', [m, ...base]);
    });
  },
  removeMatchFromHistory: (id: string): void => {
    const next = storage.loadHistory().filter(m => m.id !== id);
    safeWrite(LS.history, next);
    void idb.get('history').then(raw => {
      const parsed = SavedMatchArraySchema.safeParse(raw ?? []);
      if (!parsed.success) return;
      void idb.set(
        'history',
        parsed.data.filter(m => m.id !== id)
      );
    });
  },
  clearHistory: (): void => {
    safeRemove(LS.history);
    void idb.set('history', []);
  },
  /**
   * Remplace tout l'historique (utilisé par l'import) en passant par la
   * validation. Retourne `false` si la donnée fournie n'est pas valide.
   */
  replaceHistory: (matches: unknown): boolean => {
    const result = SavedMatchArraySchema.safeParse(matches);
    if (!result.success) return false;
    safeWrite(LS.history, result.data.slice(0, MAX_HISTORY));
    void idb.set('history', result.data);
    return true;
  },

  loadTemplates: (): MatchTemplate[] =>
    safeReadValidated(LS.templates, MatchTemplateArraySchema, []) ?? [],
  addTemplate: (template: MatchTemplate): void => {
    const current = storage.loadTemplates().filter(t => t.id !== template.id);
    const next = [template, ...current].slice(0, MAX_TEMPLATES);
    safeWrite(LS.templates, next);
  },
  removeTemplate: (id: string): void => {
    const next = storage.loadTemplates().filter(t => t.id !== id);
    safeWrite(LS.templates, next);
  },

  loadBoolPref: (key: 'sound' | 'haptic', fallback: boolean): boolean => {
    try {
      const raw = localStorage.getItem(LS[key]);
      if (!raw) return fallback;
      const v = JSON.parse(raw);
      return typeof v === 'boolean' ? v : fallback;
    } catch {
      return fallback;
    }
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
      const result = MatchConfigSchema.safeParse(JSON.parse(raw));
      return result.success ? (result.data as MatchConfig) : null;
    } catch {
      return null;
    }
  },
};
