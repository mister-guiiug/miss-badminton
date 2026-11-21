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
