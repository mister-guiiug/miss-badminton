/**
 * LE CONTRAT entre l'application et le proxy eBad / FFBaD.
 *
 * Partagé par les deux côtés : l'app valide ce qu'elle reçoit
 * (`ebad-connector.ts`), le proxy valide ce qu'il renvoie
 * (`ebad-proxy/handler.ts`). Ce fichier ne dépend que de zod et des schémas
 * de données : il s'embarque tel quel dans une fonction serveur.
 *
 *   GET {base}/tournaments?q=&from=AAAA-MM-JJ&to=AAAA-MM-JJ
 *       → { tournaments: RemoteTournament[] }
 *   GET {base}/tournaments/{id}/matches
 *       → { tournament: { id, name }, matches: RemoteMatch[] }
 */
import { z } from 'zod';
import { EbadDisciplineSchema } from './schemas';

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const TimeSchema = z.string().regex(/^\d{2}:\d{2}$/);
const SetScoreSchema = z.object({
  team1: z.number().int().min(0),
  team2: z.number().int().min(0),
});
const RemoteTeamSchema = z.object({
  primary: z.string(),
  partner: z.string().optional(),
});

export const RemoteTournamentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startDate: DateSchema.optional(),
  endDate: DateSchema.optional(),
  city: z.string().optional(),
});
export type RemoteTournament = z.infer<typeof RemoteTournamentSchema>;

export const RemoteMatchSchema = z.object({
  id: z.string().min(1),
  discipline: EbadDisciplineSchema,
  date: DateSchema.optional(),
  time: TimeSchema.optional(),
  court: z.string().optional(),
  round: z.string().optional(),
  reference: z.string().optional(),
  points: z.union([z.literal(15), z.literal(21)]).optional(),
  team1: RemoteTeamSchema,
  team2: RemoteTeamSchema,
  /** Le résultat officiel, s'il est publié. */
  score: z.array(SetScoreSchema).optional(),
});
export type RemoteMatch = z.infer<typeof RemoteMatchSchema>;

export const TournamentListSchema = z.object({
  tournaments: z.array(RemoteTournamentSchema),
});
export const TournamentMatchesSchema = z.object({
  tournament: z.object({ id: z.string().min(1), name: z.string().min(1) }),
  matches: z.array(RemoteMatchSchema),
});
export type TournamentMatches = z.infer<typeof TournamentMatchesSchema>;

export interface TournamentQuery {
  q?: string;
  from?: string;
  to?: string;
}
