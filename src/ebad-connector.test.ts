import { describe, expect, it } from 'vitest';
import {
  EbadConnectorError,
  createEbadConnector,
  importedRemoteIds,
  remoteIdOf,
  toEbadInput,
} from './ebad-connector';
import { handleEbadProxy } from './ebad-proxy/handler';
import { createMockUpstream } from './ebad-proxy/mock-upstream';
import { createFfbadUpstream } from './ebad-proxy/ffbad-upstream';
import type { EbadUpstream } from './ebad-proxy/upstream';

const NOW = new Date('2026-11-21T10:00:00');
const ORIGIN = 'https://mister-guiiug.github.io';

function viaProxy(upstream: EbadUpstream) {
  return createEbadConnector('https://proxy.example/api/ebad', (input, init) =>
    handleEbadProxy(new Request(input, init), { upstream, allowedOrigins: [] })
  );
}

describe('le client du contrat, à travers le vrai proxy', () => {
  it('cherche les tournois et filtre sur la frappe et la date', async () => {
    const c = viaProxy(createMockUpstream(NOW));
    expect((await c.searchTournaments({})).map(t => t.id)).toEqual([
      'demo-1',
      'demo-2',
    ]);
    expect(
      (await c.searchTournaments({ q: 'automne' })).map(t => t.id)
    ).toEqual(['demo-2']);
    expect(
      (await c.searchTournaments({ from: '2026-12-01' })).map(t => t.id)
    ).toEqual(['demo-2']);
  });

  it('rend les matchs d’un tournoi', async () => {
    const c = viaProxy(createMockUpstream(NOW));
    const data = await c.tournamentMatches('demo-1');
    expect(data.tournament.name).toBe('Tournoi de démonstration');
    expect(data.matches).toHaveLength(3);
  });

  it('un tournoi inconnu est une erreur HTTP 404', async () => {
    const c = viaProxy(createMockUpstream(NOW));
    await expect(c.tournamentMatches('nope')).rejects.toMatchObject({
      kind: 'http',
      status: 404,
    });
  });

  it('un proxy pas encore branché sur la FFBaD répond « unavailable »', async () => {
    const c = viaProxy(createFfbadUpstream({}));
    await expect(c.searchTournaments({})).rejects.toMatchObject({
      kind: 'unavailable',
    });
  });

  it('une réponse hors contrat est refusée', async () => {
    const c = createEbadConnector('https://x', () =>
      Promise.resolve(
        new Response(JSON.stringify({ tournaments: [{ nom: 'x' }] }), {
          status: 200,
        })
      )
    );
    await expect(c.searchTournaments({})).rejects.toBeInstanceOf(
      EbadConnectorError
    );
    await expect(c.searchTournaments({})).rejects.toMatchObject({
      kind: 'invalid',
    });
  });

  it('un réseau absent est une erreur « network »', async () => {
    const c = createEbadConnector('https://x', () =>
      Promise.reject(new TypeError('Failed to fetch'))
    );
    await expect(c.searchTournaments({})).rejects.toMatchObject({
      kind: 'network',
    });
  });
});

describe('le proxy', () => {
  const upstream = createMockUpstream(NOW);

  it('refuse une origine non autorisée, accepte la bonne', async () => {
    const opts = { upstream, allowedOrigins: [ORIGIN] };
    const bad = await handleEbadProxy(
      new Request('https://p/tournaments', {
        headers: { Origin: 'https://ailleurs.example' },
      }),
      opts
    );
    expect(bad.status).toBe(403);
    const good = await handleEbadProxy(
      new Request('https://p/tournaments', { headers: { Origin: ORIGIN } }),
      opts
    );
    expect(good.status).toBe(200);
    expect(good.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  });

  it('répond au pré-vol CORS', async () => {
    const res = await handleEbadProxy(
      new Request('https://p/tournaments', {
        method: 'OPTIONS',
        headers: { Origin: ORIGIN },
      }),
      { upstream, allowedOrigins: [ORIGIN] }
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('borne les paramètres et les méthodes', async () => {
    const opts = { upstream, allowedOrigins: [] };
    const badDate = await handleEbadProxy(
      new Request('https://p/tournaments?from=demain'),
      opts
    );
    expect(badDate.status).toBe(400);
    const post = await handleEbadProxy(
      new Request('https://p/tournaments', { method: 'POST' }),
      opts
    );
    expect(post.status).toBe(405);
    const route = await handleEbadProxy(new Request('https://p/joueurs'), opts);
    expect(route.status).toBe(404);
  });

  it('une source qui dérive du contrat donne une 502, sans fuite', async () => {
    const broken: EbadUpstream = {
      searchTournaments: () => Promise.resolve([{ id: '', name: '' }] as never),
      tournamentMatches: () => Promise.reject(new Error('secret=abc')),
    };
    const opts = { upstream: broken, allowedOrigins: [] };
    const list = await handleEbadProxy(
      new Request('https://p/tournaments'),
      opts
    );
    expect(list.status).toBe(502);
    const detail = await handleEbadProxy(
      new Request('https://p/tournaments/x/matches'),
      opts
    );
    expect(detail.status).toBe(502);
    expect(await detail.text()).not.toContain('secret');
  });
});

describe('vers le registre eBad', () => {
  it('un match importé porte son identifiant distant et le résultat officiel', async () => {
    const c = viaProxy(createMockUpstream(NOW));
    const data = await c.tournamentMatches('demo-1');
    const [first] = data.matches;
    if (!first) throw new Error('jeu de démonstration vide');
    const input = toEbadInput(data.tournament, first);
    expect(input.remoteId).toBe(remoteIdOf('demo-1', 'm1'));
    expect(input.tournament).toBe('Tournoi de démonstration');
    expect(input.reportedScore).toEqual([
      { team1: 15, team2: 11 },
      { team1: 15, team2: 13 },
    ]);
  });

  it('retrouve les identifiants déjà importés', () => {
    const ids = importedRemoteIds([
      {
        id: 'a',
        createdAt: 1,
        tournament: 'T',
        discipline: 'SH',
        team1: { primary: 'A' },
        team2: { primary: 'B' },
        remoteId: 'ffbad:t:1',
      },
      {
        id: 'b',
        createdAt: 2,
        tournament: 'T',
        discipline: 'SH',
        team1: { primary: 'A' },
        team2: { primary: 'B' },
      },
    ]);
    expect([...ids]).toEqual(['ffbad:t:1']);
  });
});

describe('OAuth à travers le proxy', () => {
  async function importOAuth() {
    return import('./ebad-proxy/oauth');
  }

  it('échange le code de démonstration contre un jeton', async () => {
    const { createMockExchanger } = await importOAuth();
    const c = createEbadConnector('https://p', (input, init) =>
      handleEbadProxy(new Request(input, init), {
        upstream: createMockUpstream(NOW),
        oauth: createMockExchanger(),
        allowedOrigins: [],
      })
    );
    await expect(
      c.exchangeCode({
        code: 'mock-code',
        codeVerifier: 'v',
        redirectUri: 'https://app.example/',
      })
    ).resolves.toEqual({ access_token: 'mock-token', expires_in: 3600 });
    await expect(
      c.exchangeCode({
        code: 'faux',
        codeVerifier: 'v',
        redirectUri: 'https://app.example/',
      })
    ).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('refuse une adresse de retour hors des origines autorisées', async () => {
    const { createMockExchanger } = await importOAuth();
    const res = await handleEbadProxy(
      new Request('https://p/oauth/token', {
        method: 'POST',
        headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'mock-code',
          code_verifier: 'v',
          redirect_uri: 'https://ailleurs.example/',
        }),
      }),
      {
        upstream: createMockUpstream(NOW),
        oauth: createMockExchanger(),
        allowedOrigins: [ORIGIN],
      }
    );
    expect(res.status).toBe(400);
  });

  it('sans client OAuth, l’échange répond « unavailable »', async () => {
    const c = viaProxy(createMockUpstream(NOW));
    await expect(
      c.exchangeCode({
        code: 'x',
        codeVerifier: 'v',
        redirectUri: 'https://app.example/',
      })
    ).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('le jeton de l’utilisateur va jusqu’à la source, en cache privé', async () => {
    let seen: string | undefined;
    const upstream: EbadUpstream = {
      searchTournaments: (_q, ctx) => {
        seen = ctx?.accessToken;
        return Promise.resolve([]);
      },
      tournamentMatches: () => Promise.resolve(null),
    };
    const res = await handleEbadProxy(
      new Request('https://p/tournaments', {
        headers: { Authorization: 'Bearer abc' },
      }),
      { upstream, allowedOrigins: [] }
    );
    expect(seen).toBe('abc');
    expect(res.headers.get('Cache-Control')).toMatch(/^private/);
    const c = createEbadConnector(
      'https://p',
      (input, init) =>
        handleEbadProxy(new Request(input, init), {
          upstream,
          allowedOrigins: [],
        }),
      () => 'jeton-app'
    );
    await c.searchTournaments({});
    expect(seen).toBe('jeton-app');
  });

  it('une source qui refuse le jeton donne « unauthorized »', async () => {
    const { UpstreamUnauthorizedError } = await import('./ebad-proxy/upstream');
    const c = viaProxy({
      searchTournaments: () => Promise.reject(new UpstreamUnauthorizedError()),
      tournamentMatches: () => Promise.resolve(null),
    });
    await expect(c.searchTournaments({})).rejects.toMatchObject({
      kind: 'unauthorized',
    });
  });

  it('l’échange standard poste le formulaire OAuth au point de jeton', async () => {
    const { createTokenEndpointExchanger } = await importOAuth();
    let posted: URLSearchParams | null = null;
    const exchanger = createTokenEndpointExchanger(
      {
        FFBAD_OAUTH_TOKEN_URL: 'https://auth.example/token',
        FFBAD_OAUTH_CLIENT_ID: 'mb',
        FFBAD_OAUTH_CLIENT_SECRET: 's3cret',
      },
      (_input, init) => {
        posted = new URLSearchParams(String(init?.body));
        return Promise.resolve(
          new Response(
            JSON.stringify({ access_token: 'at', expires_in: 120 }),
            { status: 200 }
          )
        );
      }
    );
    await expect(
      exchanger.exchange({
        code: 'c',
        codeVerifier: 'v',
        redirectUri: 'https://app.example/',
      })
    ).resolves.toEqual({ accessToken: 'at', expiresIn: 120 });
    expect(Object.fromEntries(posted ?? [])).toEqual({
      grant_type: 'authorization_code',
      code: 'c',
      redirect_uri: 'https://app.example/',
      client_id: 'mb',
      code_verifier: 'v',
      client_secret: 's3cret',
    });
  });
});
