/**
 * LE PROXY eBad / FFBaD — un gestionnaire `Request → Response` standard.
 *
 * Il tourne tel quel sur une fonction Vercel (runtime Edge), un Cloudflare
 * Worker, Deno ou Node 18+ : aucune dépendance à un hébergeur. Voir
 * `docs/ebad-connecteur.md` pour le déploiement.
 *
 * Ce qu'il garantit, quelle que soit la source amont :
 * - GET seulement, deux routes (le contrat de `ebad-connector.ts`) ;
 * - CORS restreint aux origines autorisées — un autre site ne peut pas se
 *   servir du proxy depuis le navigateur de ses visiteurs ;
 * - paramètres bornés et vérifiés avant d'atteindre la source ;
 * - réponses revalidées contre le contrat : une source qui dérive produit
 *   une 502, jamais une donnée malformée côté application ;
 * - aucune erreur amont recopiée telle quelle (elle pourrait contenir
 *   identifiants ou détails internes).
 */
import {
  TournamentListSchema,
  TournamentMatchesSchema,
} from '../ebad-contract';
import { UpstreamNotConfiguredError, type EbadUpstream } from './upstream';

export interface EbadProxyOptions {
  upstream: EbadUpstream;
  /**
   * Origines autorisées (`https://exemple.github.io`). Liste vide : aucun
   * en-tête CORS n'est posé — appels de serveur à serveur ou en mémoire.
   */
  allowedOrigins: readonly string[];
  /** Durée de cache côté navigateur et CDN, en secondes (défaut 300). */
  cacheSeconds?: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_QUERY = 80;
const MAX_ID = 64;

function json(
  status: number,
  body: unknown,
  headers: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

function corsHeaders(
  origin: string | null,
  allowed: readonly string[]
): Record<string, string> | null {
  if (!origin || allowed.length === 0) return {};
  if (!allowed.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function handleEbadProxy(
  request: Request,
  options: EbadProxyOptions
): Promise<Response> {
  const cors = corsHeaders(
    request.headers.get('Origin'),
    options.allowedOrigins
  );
  if (cors === null) return json(403, { error: 'origin' }, { Vary: 'Origin' });

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'GET') {
    return json(405, { error: 'method' }, { ...cors, Allow: 'GET, OPTIONS' });
  }

  const url = new URL(request.url);
  const cache = {
    ...cors,
    'Cache-Control': `public, max-age=${options.cacheSeconds ?? 300}`,
  };

  try {
    // Le gestionnaire peut être monté sous un préfixe (`/api/ebad/...`) :
    // seule la fin du chemin compte.
    const list = /\/tournaments\/?$/.exec(url.pathname);
    if (list) {
      const q = (url.searchParams.get('q') ?? '').trim();
      const from = url.searchParams.get('from') ?? undefined;
      const to = url.searchParams.get('to') ?? undefined;
      if (
        q.length > MAX_QUERY ||
        (from && !DATE.test(from)) ||
        (to && !DATE.test(to))
      ) {
        return json(400, { error: 'query' }, cors);
      }
      const tournaments = await options.upstream.searchTournaments({
        q: q || undefined,
        from,
        to,
      });
      const body = TournamentListSchema.safeParse({ tournaments });
      if (!body.success) return json(502, { error: 'upstream' }, cors);
      return json(200, body.data, cache);
    }

    const detail = /\/tournaments\/([^/]+)\/matches\/?$/.exec(url.pathname);
    if (detail) {
      const id = decodeURIComponent(detail[1] ?? '');
      if (!id || id.length > MAX_ID) return json(400, { error: 'id' }, cors);
      const data = await options.upstream.tournamentMatches(id);
      if (!data) return json(404, { error: 'tournament' }, cors);
      const body = TournamentMatchesSchema.safeParse(data);
      if (!body.success) return json(502, { error: 'upstream' }, cors);
      return json(200, body.data, cache);
    }

    return json(404, { error: 'route' }, cors);
  } catch (error) {
    if (error instanceof UpstreamNotConfiguredError) {
      return json(501, { error: 'not-configured' }, cors);
    }
    return json(502, { error: 'upstream' }, cors);
  }
}
