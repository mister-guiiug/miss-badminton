/**
 * L'ADAPTATEUR WebServices FFBaD — À BRANCHER.
 *
 * Les WebServices de la FFBaD (`api.ffbad.org`) existent, mais leur accès
 * passe par une CONVENTION avec la fédération, qui délivre identifiants et
 * documentation. Ni l'un ni l'autre n'est disponible à l'écriture de ce
 * fichier : les noms de fonctions, les paramètres et le format des réponses
 * ne sont donc PAS devinés ici. Un adaptateur inventé appellerait des routes
 * qui n'existent peut-être pas, ou pire, des routes internes sans
 * autorisation.
 *
 * Tant que ce n'est pas branché, chaque appel lève
 * `UpstreamNotConfiguredError` : le proxy répond 501 et l'application affiche
 * « connecteur pas encore branché ». Le reste de la chaîne (contrat, CORS,
 * validation, écran d'import, fusion dans le registre) est en place et testé
 * avec le jeu de démonstration (`mock-upstream.ts`).
 *
 * POUR LE BRANCHER, une fois la convention obtenue :
 *  1. renseigner les variables d'environnement SERVEUR (jamais `VITE_…`) :
 *     `FFBAD_API_URL`, `FFBAD_LOGIN`, `FFBAD_PASSWORD` ;
 *  2. implémenter `searchTournaments` et `tournamentMatches` d'après la
 *     documentation reçue, en traduisant vers le contrat
 *     (`ebad-contract.ts`) — le gestionnaire revalide la sortie ;
 *  3. ne garder que les champs du contrat : aucune donnée personnelle
 *     au-delà des noms (pas de licence, de date de naissance, de club…) ;
 *  4. si la FFBaD délivre un client OAuth (« Se connecter avec MyFFBaD »),
 *     présenter `context.accessToken` — le jeton de l'utilisateur — au lieu
 *     des identifiants de convention, et lever `UpstreamUnauthorizedError`
 *     quand l'API le refuse (cf. `oauth.ts`).
 */
import type { RemoteTournament, TournamentMatches } from '../ebad-contract';
import { UpstreamNotConfiguredError, type EbadUpstream } from './upstream';

export interface FfbadEnv {
  FFBAD_API_URL?: string;
  FFBAD_LOGIN?: string;
  FFBAD_PASSWORD?: string;
}

export function createFfbadUpstream(env: FfbadEnv): EbadUpstream {
  const configured = !!(
    env.FFBAD_API_URL?.trim() &&
    env.FFBAD_LOGIN?.trim() &&
    env.FFBAD_PASSWORD?.trim()
  );
  const refuse = (): never => {
    throw new UpstreamNotConfiguredError(
      configured
        ? 'Adaptateur FFBaD non implémenté : documentation de la convention requise.'
        : 'Identifiants FFBaD absents (FFBAD_API_URL, FFBAD_LOGIN, FFBAD_PASSWORD).'
    );
  };
  return {
    searchTournaments(): Promise<RemoteTournament[]> {
      return Promise.resolve().then(refuse);
    },
    tournamentMatches(): Promise<TournamentMatches | null> {
      return Promise.resolve().then(refuse);
    },
  };
}
