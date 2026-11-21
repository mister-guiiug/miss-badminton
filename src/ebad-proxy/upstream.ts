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

/**
 * Ce que le proxy sait de l'appelant. `accessToken` : le jeton OAuth de
 * l'UTILISATEUR (« Se connecter avec MyFFBaD »), transmis par l'application
 * en `Authorization: Bearer`. Absent : appel anonyme, ou avec les
 * identifiants de convention du serveur.
 */
export interface UpstreamContext {
  accessToken?: string;
}

export interface EbadUpstream {
  searchTournaments(
    query: TournamentQuery,
    context?: UpstreamContext
  ): Promise<RemoteTournament[]>;
  /** `null` : tournoi inconnu (le proxy répond 404). */
  tournamentMatches(
    tournamentId: string,
    context?: UpstreamContext
  ): Promise<TournamentMatches | null>;
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

/**
 * La source refuse l'appelant : jeton absent, expiré ou révoqué. Le proxy
 * répond 401 et l'application propose de se reconnecter.
 */
export class UpstreamUnauthorizedError extends Error {
  constructor() {
    super('unauthorized');
    this.name = 'UpstreamUnauthorizedError';
  }
}
