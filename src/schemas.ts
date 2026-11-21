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
  /**
   * Le CÔTÉ de terrain d'origine de l'équipe, pas un joueur. Voir
   * `MatchSetupWizard.Team` et `MatchView` (`team1.id === 'B'` après une
   * permutation). Ne pas confondre avec `primaryId` / `partnerId`.
   */
  id: z.enum(['A', 'B']).optional(),
  /**
   * Identifiants stables des profils joueurs (cf. `players.ts`). Optionnels :
   * tout match enregistré avant la migration des profils n'en porte pas, et
   * doit continuer de se lire tel quel.
   */
  primaryId: z.string().optional(),
  partnerId: z.string().optional(),
});
export type Team = z.infer<typeof TeamSchema>;

const MatchTypeSchema = z.enum(['singles', 'doubles']);
const SetCountSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(5),
]);
const PointsTargetSchema = z.union([
  z.literal(5),
  z.literal(11),
  z.literal(15),
  z.literal(21),
  z.literal(30),
  z.literal(31),
]);
const SideChangeSchema = z.enum(['decisive', 'each-set', 'mid-match']);
/** Borne supérieure au score d'un set (peut être null = pas de plafond). */
const PointsCapSchema = z.number().int().positive().nullable();
/**
 * L'écart pour gagner un set, et le point du changement de côté en cours de
 * set. Des entiers, pas une liste de valeurs : une version antérieure de l'app
 * rejetterait tout l'historique d'un match joué avec une valeur qu'elle ne
 * connaîtrait pas, là où un nombre inattendu se joue simplement.
 */
const WinBySchema = z.number().int().positive();
const SideChangeAtSchema = z.number().int().positive();
/** Limite de temps en minutes (null = pas de limite). */
const TimeLimitSchema = z.number().int().positive().nullable();
/** Comportement quand la limite de temps est atteinte ou à égalité. */
const TieBreakSchema = z.enum(['none', 'sudden-death']);

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
  // Le format de 2026 (cf. `scoring.ts`). Oubliés ici, zod les retirerait à
  // chaque lecture : un match en 15 points perdrait son changement de côté à 8
  // dans l'historique, un modèle ou un lien « rejouer ».
  winBy: WinBySchema.optional(),
  sideChangeAt: SideChangeAtSchema.optional(),
  /**
   * Le match eBad préparé qui a lancé ce match (cf. `ebad.ts`). Un simple
   * INDICE : à la fin du match, il sert à lier le résultat au match eBad s'il
   * est encore libre. La liaison elle-même vit sur le match eBad
   * (`EbadMatch.linkedMatchId`) — une seule source de vérité. Optionnel, donc
   * une version antérieure le retire à la lecture sans rien rejeter.
   */
  ebadMatchId: z.string().optional(),
});

const SetScoreSchema = z.object({
  team1: z.number().int().min(0),
  team2: z.number().int().min(0),
});

const ServiceSideSchema = z.enum(['team1', 'team2']);

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
export type SavedMatch = z.infer<typeof SavedMatchSchema>;

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

/**
 * Liste de noms de joueurs mémorisée pour l'autocomplete — FORMAT HÉRITÉ.
 *
 * Conservé pour deux raisons, et deux seulement : lire la clé
 * `mb_player_names` d'un utilisateur qui n'a pas encore migré, et lire le
 * champ `players` d'un fichier exporté avant les profils. Rien n'écrit plus
 * ce format côté stockage ; l'export, lui, continue de le remplir pour
 * qu'une version antérieure sache relire un fichier récent.
 */
export const PlayerNamesSchema = z.array(z.string());

/**
 * Un profil joueur : un identifiant qui ne bouge pas, un nom qui peut bouger.
 * `createdAt` sert d'ordre d'affichage stable, pas d'information métier.
 */
export const PlayerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.number().int().positive(),
});
export const PlayerArraySchema = z.array(PlayerSchema);
export type Player = z.infer<typeof PlayerSchema>;

/** Modèle de match favori : un MatchConfig nommé, rappelable depuis la home. */
const MatchTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  createdAt: z.number().int().positive(),
  config: MatchConfigSchema,
});
export const MatchTemplateArraySchema = z.array(MatchTemplateSchema);
export type MatchTemplate = z.infer<typeof MatchTemplateSchema>;

/**
 * Format du blob d'export complet (Settings → Export).
 *
 * DEUX CHAMPS POUR LES JOUEURS, ET C'EST VOULU. `players` reste la liste de
 * NOMS d'avant les profils : une version antérieure de l'app la valide et
 * relit donc un fichier exporté par celle-ci sans rien rejeter. Les profils
 * (identifiants compris) voyagent à côté, sous `playerProfiles` ; une version
 * antérieure ignore simplement cette clé (zod n'est pas strict ici, elle est
 * écartée à la lecture). L'import de cette version-ci préfère `playerProfiles`
 * quand il est présent, et migre `players` sinon.
 */
export const ExportBundleSchema = z.object({
  version: z.string().optional(),
  history: SavedMatchArraySchema.optional(),
  players: PlayerNamesSchema.optional(),
  playerProfiles: PlayerArraySchema.optional(),
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

/**
 * LES MATCHS SUIVIS DANS eBad (l'application de la FFBaD), recopiés à la main.
 *
 * eBad n'expose aucune API publique, et l'app n'a pas de serveur : on ne peut
 * donc pas aller y chercher les matchs. L'utilisateur saisit ce qu'il y lit —
 * tournoi, tableau, terrain, joueurs — et ce registre sert à deux choses :
 * PRÉPARER un match (l'assistant s'ouvre prérempli) et RAPPROCHER un match
 * scoré en direct du match eBad, pour savoir quel score y reporter et
 * vérifier celui qui y a été saisi.
 */
export const EbadDisciplineSchema = z.enum(['SH', 'SD', 'DH', 'DD', 'DX']);
export type EbadDiscipline = z.infer<typeof EbadDisciplineSchema>;

const EbadTeamSchema = z.object({
  primary: z.string(),
  partner: z.string().optional(),
});

export const EbadMatchSchema = z.object({
  id: z.string().min(1),
  createdAt: z.number().int().positive(),
  tournament: z.string().min(1),
  /** Jour du match, `AAAA-MM-JJ`. */
  date: z.string().optional(),
  discipline: EbadDisciplineSchema,
  /** Tableau et tour, tels qu'eBad les affiche (« SH P10 — Poule A »). */
  round: z.string().optional(),
  court: z.string().optional(),
  /** Heure prévue, `HH:MM`. */
  time: z.string().optional(),
  /** Le numéro du match dans eBad. */
  reference: z.string().optional(),
  /** Le format annoncé : 15 points (défaut FFBaD depuis 09/2026) ou 21. */
  points: z.union([z.literal(15), z.literal(21)]).optional(),
  team1: EbadTeamSchema,
  team2: EbadTeamSchema,
  /** Le score tel qu'il a été saisi dans eBad, dans l'ordre des équipes eBad. */
  reportedScore: z.array(SetScoreSchema).optional(),
  /** L'identifiant du match de l'historique (`SavedMatch.id`) lié. */
  linkedMatchId: z.string().optional(),
});
export const EbadMatchArraySchema = z.array(EbadMatchSchema);
export type EbadMatch = z.infer<typeof EbadMatchSchema>;
export type EbadSetScore = z.infer<typeof SetScoreSchema>;
