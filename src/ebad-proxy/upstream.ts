/**
 * La SOURCE AMONT du proxy : ce qui sait vraiment lire les tournois.
 *
 * Le gestionnaire (`handler.ts`) ne connaît que cette interface : brancher
 * les WebServices de la FFBaD, une autre source, ou le jeu de démonstration
 * ne change rien au contrat que voit l'application.
 */
import type {
  RemoteTournament,
  TournamentMatches,
  TournamentQuery,
} from '../ebad-contract';

export interface EbadUpstream {
  searchTournaments(query: TournamentQuery): Promise<RemoteTournament[]>;
  /** `null` : tournoi inconnu (le proxy répond 404). */
  tournamentMatches(tournamentId: string): Promise<TournamentMatches | null>;
}

/**
 * La source existe mais ne peut pas encore servir : identifiants absents,
 * convention non signée, adaptateur pas écrit. Le proxy répond 501, et
 * l'application le dit en clair au lieu d'une erreur réseau anonyme.
 */
export class UpstreamNotConfiguredError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'UpstreamNotConfiguredError';
  }
}
