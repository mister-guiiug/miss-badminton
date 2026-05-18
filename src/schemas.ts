import { z } from 'zod';

/**
 * Schémas zod pour les données persistées dans localStorage / IndexedDB et
 * pour les imports utilisateur. Toute lecture passe par `.safeParse` afin
 * d'isoler le reste du code des données corrompues, anciennes ou malveillantes.
 *
 * Les types TS exposés ici doivent rester strictement compatibles avec ceux
 * définis dans `react/components/MatchSetupWizard.tsx` et `storage.ts` — la
 * source de vérité reste TS, zod sert de garde runtime.
 */

export const TeamSchema = z.object({
  primary: z.string(),
  partner: z.string().optional(),
  id: z.enum(['A', 'B']).optional(),
});

export const MatchTypeSchema = z.enum(['singles', 'doubles']);
export const SetCountSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(5),
]);
export const PointsTargetSchema = z.union([
  z.literal(5),
  z.literal(11),
  z.literal(15),
  z.literal(21),
  z.literal(30),
  z.literal(31),
]);
export const SideChangeSchema = z.enum(['decisive', 'each-set', 'mid-match']);
/** Borne supérieure au score d'un set (peut être null = pas de plafond). */
export const PointsCapSchema = z.number().int().positive().nullable();
/** Limite de temps en minutes (null = pas de limite). */
export const TimeLimitSchema = z.number().int().positive().nullable();
/** Comportement quand la limite de temps est atteinte ou à égalité. */
export const TieBreakSchema = z.enum(['none', 'sudden-death']);

export const MatchConfigSchema = z.object({
  type: MatchTypeSchema,
  sets: SetCountSchema,
  points: PointsTargetSchema,
  cap: PointsCapSchema,
  sideChange: SideChangeSchema,
  team1: TeamSchema,
  team2: TeamSchema,
  // Champs optionnels introduits ultérieurement : conservés optionnels au
  // schéma pour garder la rétrocompatibilité des données déjà persistées.
  timeLimitMin: TimeLimitSchema.optional(),
  tieBreak: TieBreakSchema.optional(),
});

export const SetScoreSchema = z.object({
  team1: z.number().int().min(0),
  team2: z.number().int().min(0),
});

export const ServiceSideSchema = z.enum(['team1', 'team2']);

export const SavedMatchSchema = z.object({
  id: z.string(),
  completedAt: z.number().int().positive(),
  config: MatchConfigSchema,
  setScores: z.array(SetScoreSchema),
  finalSetWins: z.object({
    team1: z.number().int().min(0),
    team2: z.number().int().min(0),
  }),
  winner: ServiceSideSchema,
  durationMs: z.number().int().min(0).optional(),
  maxStreak: z
    .object({
      team1: z.number().int().min(0),
      team2: z.number().int().min(0),
    })
    .optional(),
});

export const SavedMatchArraySchema = z.array(SavedMatchSchema);

export const PersistedGameStateSchema = z.object({
  score1: z.number().int().min(0),
  score2: z.number().int().min(0),
  setWins: z.object({
    team1: z.number().int().min(0),
    team2: z.number().int().min(0),
  }),
  matchWinner: ServiceSideSchema.nullable(),
  server: ServiceSideSchema.nullable(),
  setScores: z.array(SetScoreSchema),
  pendingSideChange: z.boolean(),
  mid11Triggered: z.boolean(),
  startedAt: z.number().nullable(),
  endedAt: z.number().nullable(),
  pausedAt: z.number().nullable().optional(),
  totalPausedMs: z.number().min(0).optional(),
  streak1: z.number().int().min(0),
  streak2: z.number().int().min(0),
  maxStreak1: z.number().int().min(0),
  maxStreak2: z.number().int().min(0),
});

/** Liste de noms de joueurs mémorisée pour l'autocomplete. */
export const PlayerNamesSchema = z.array(z.string());

/** Format du blob d'export complet (Settings → Export). */
export const ExportBundleSchema = z.object({
  version: z.string().optional(),
  history: SavedMatchArraySchema.optional(),
  players: PlayerNamesSchema.optional(),
  settings: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      locale: z.string().optional(),
      team1Color: z.string().optional(),
      team2Color: z.string().optional(),
      sound: z.boolean().optional(),
      haptic: z.boolean().optional(),
    })
    .optional(),
});

export type ExportBundle = z.infer<typeof ExportBundleSchema>;
