/**
 * Cadre de migration pour les données persistées.
 *
 * Principe : chaque entité versionnée stocke un champ `__version: number`.
 * Au chargement, si la version diffère de `CURRENT_VERSION`, on applique
 * séquentiellement les migrations enregistrées avant de valider via zod.
 *
 * Cas d'usage typique :
 *   migrations.matchConfig[1] = old => ({ ...old, tieBreak: 'none' });
 * Quand on lit du v1, on récupère un v2 propre sans wipe ; le backup
 * horodaté reste effectué dans `storage.runMigrations` en filet de sécurité.
 *
 * Note : on évite d'imposer le champ `__version` aux schémas externes
 * (export bundle utilisateur, replay URL) — la migration s'applique
 * uniquement à la lecture depuis storage.
 */

import type { z } from 'zod';

export type MigrationFn = (old: unknown) => unknown;

export interface MigrationRegistry {
  [entity: string]: {
    current: number;
    /** Clé = version d'origine ; valeur = transforme v→v+1. */
    [from: number]: MigrationFn;
  };
}

/**
 * Pas de migration enregistrée pour l'instant — le scaffolding est en place
 * pour les futures évolutions. Quand un nouveau champ obligatoire apparaît,
 * ajouter une entrée ici plutôt que de bumper `CURRENT_DATA_VERSION` dans
 * storage.ts (qui wipe sec).
 */
export const migrations: MigrationRegistry = {
  matchConfig: { current: 1 },
  savedMatch: { current: 1 },
  persistedGame: { current: 1 },
};

/**
 * Applique les migrations en chaîne sur un objet versionné.
 *
 * - Si `raw` est `null`/`undefined` ou pas un objet : retour direct.
 * - Si `raw` n'a pas de `__version`, on suppose version 1 (origine).
 * - Si version > current : retour direct (la lecture ultérieure échouera
 *   probablement à zod et provoquera un fallback — c'est intentionnel).
 */
export function migrate(
  entity: keyof MigrationRegistry,
  raw: unknown
): unknown {
  if (raw === null || typeof raw !== 'object') return raw;
  const obj = raw as Record<string, unknown>;
  const target = migrations[entity]?.current ?? 1;
  let version = typeof obj.__version === 'number' ? obj.__version : 1;
  let value: unknown = raw;
  while (version < target) {
    const step = migrations[entity]?.[version];
    if (typeof step !== 'function') break;
    value = step(value);
    version += 1;
  }
  // Stamp final.
  if (typeof value === 'object' && value !== null) {
    (value as Record<string, unknown>).__version = target;
  }
  return value;
}

/**
 * Helper : lit un blob depuis localStorage, applique les migrations, puis
 * valide via zod. Retourne `fallback` si tout échoue (et conserve le brut
 * via le mécanisme de backup de `storage.ts`).
 */
export function readMigratedAndValidated<T>(
  entity: keyof MigrationRegistry,
  raw: unknown,
  schema: z.ZodType<T>,
  fallback: T | null = null
): T | null {
  const migrated = migrate(entity, raw);
  const result = schema.safeParse(migrated);
  return result.success ? result.data : fallback;
}
