/**
 * LE CONNECTEUR eBad / FFBaD — côté application.
 *
 * eBad lit les tournois dans les WebServices de la FFBaD, dont l'accès est
 * soumis à une convention avec la fédération et à des identifiants. Ces
 * identifiants ne peuvent pas vivre dans une PWA statique : tout ce qui part
 * dans le bundle est lisible par n'importe qui. L'app parle donc à un PROXY
 * (`src/ebad-proxy/`), un petit serveur qui garde les identifiants et ne
 * rend que ce dont l'app a besoin, sous un CONTRAT défini ici.
 *
 * Le contrat est le nôtre, pas celui de la FFBaD : l'app ne dépend pas du
 * format amont, qui peut changer sans qu'on republie la PWA. Le proxy
 * traduit ; l'app valide (zod) tout ce qu'elle reçoit.
 *
 * Le contrat (routes et formats) est dans `ebad-contract.ts`.
 *
 * Interrupteur : `VITE_EBAD_PROXY_URL`. Absente, le connecteur n'existe pas
 * et l'import ne s'affiche pas. `mock` branche un jeu de démonstration en
 * mémoire, qui passe par le VRAI gestionnaire du proxy.
 */
import type { z } from 'zod';
import type { EbadMatch } from './schemas';
import type { EbadMatchInput } from './store/useEbadStore';
import {
  TournamentListSchema,
  TournamentMatchesSchema,
  type RemoteMatch,
  type RemoteTournament,
  type TournamentMatches,
  type TournamentQuery,
} from './ebad-contract';

export type {
  RemoteMatch,
  RemoteTournament,
  TournamentMatches,
  TournamentQuery,
} from './ebad-contract';

/**
 * Pourquoi un appel a échoué, dans des termes que l'écran sait dire :
 * - `network` : le proxy n'a pas répondu (hors ligne, CORS, DNS) ;
 * - `unavailable` : le proxy répond 501 — il existe, mais n'est pas encore
 *   branché sur la FFBaD (convention, identifiants) ;
 * - `http` : une autre erreur HTTP ;
 * - `invalid` : la réponse ne respecte pas le contrat.
 */
export class EbadConnectorError extends Error {
  constructor(
    readonly kind: 'network' | 'unavailable' | 'http' | 'invalid',
    readonly status?: number
  ) {
    super(`ebad-connector: ${kind}${status ? ` (${status})` : ''}`);
    this.name = 'EbadConnectorError';
  }
}

export interface EbadConnector {
  searchTournaments(query: TournamentQuery): Promise<RemoteTournament[]>;
  tournamentMatches(tournamentId: string): Promise<TournamentMatches>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Un client du contrat, sur n'importe quelle implémentation de `fetch`. */
export function createEbadConnector(
  baseUrl: string,
  fetchImpl: FetchLike = (input, init) => fetch(input, init)
): EbadConnector {
  const base = baseUrl.replace(/\/+$/, '');

  async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}`, {
        headers: { Accept: 'application/json' },
      });
    } catch {
      throw new EbadConnectorError('network');
    }
    if (response.status === 501) {
      throw new EbadConnectorError('unavailable', 501);
    }
    if (!response.ok) throw new EbadConnectorError('http', response.status);
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new EbadConnectorError('invalid');
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new EbadConnectorError('invalid');
    return parsed.data;
  }

  return {
    async searchTournaments(query) {
      const params = new URLSearchParams();
      if (query.q?.trim()) params.set('q', query.q.trim());
      if (query.from) params.set('from', query.from);
      if (query.to) params.set('to', query.to);
      const qs = params.toString();
      const data = await getJson(
        `/tournaments${qs ? `?${qs}` : ''}`,
        TournamentListSchema
      );
      return data.tournaments;
    },
    tournamentMatches(tournamentId) {
      return getJson(
        `/tournaments/${encodeURIComponent(tournamentId)}/matches`,
        TournamentMatchesSchema
      );
    },
  };
}

/** L'identifiant stable d'un match importé : source, tournoi, match. */
export function remoteIdOf(tournamentId: string, matchId: string): string {
  return `ffbad:${tournamentId}:${matchId}`;
}

/**
 * Un match du connecteur, prêt pour le registre eBad. Le résultat officiel
 * devient le « score saisi dans eBad » : c'est lui que l'app compare au
 * match scoré.
 */
export function toEbadInput(
  tournament: TournamentMatches['tournament'],
  match: RemoteMatch
): EbadMatchInput {
  return {
    tournament: tournament.name,
    date: match.date,
    time: match.time,
    discipline: match.discipline,
    round: match.round,
    court: match.court,
    reference: match.reference,
    points: match.points,
    team1: { primary: match.team1.primary, partner: match.team1.partner },
    team2: { primary: match.team2.primary, partner: match.team2.partner },
    reportedScore: match.score,
    remoteId: remoteIdOf(tournament.id, match.id),
  };
}

/** Les identifiants distants déjà présents dans le registre. */
export function importedRemoteIds(matches: readonly EbadMatch[]): Set<string> {
  return new Set(
    matches.map(m => m.remoteId).filter((id): id is string => !!id)
  );
}

/** L'adresse du proxy configurée au build, ou `null` : pas de connecteur. */
export function configuredProxyUrl(): string | null {
  const raw = (import.meta.env.VITE_EBAD_PROXY_URL ?? '').trim();
  return raw === '' ? null : raw;
}

/**
 * Le connecteur de l'app, d'après la configuration. `mock` charge à la
 * demande le jeu de démonstration et le vrai gestionnaire du proxy : rien
 * de tout cela n'entre dans le bundle tant qu'on ne s'en sert pas.
 */
export async function loadConfiguredConnector(): Promise<EbadConnector | null> {
  const url = configuredProxyUrl();
  if (!url) return null;
  if (url !== 'mock') return createEbadConnector(url);
  const [{ handleEbadProxy }, { createMockUpstream }] = await Promise.all([
    import('./ebad-proxy/handler'),
    import('./ebad-proxy/mock-upstream'),
  ]);
  const upstream = createMockUpstream();
  return createEbadConnector('https://mock.invalid', (input, init) =>
    handleEbadProxy(new Request(input, init), {
      upstream,
      allowedOrigins: [],
    })
  );
}
