/**
 * La migration noms → profils À TRAVERS LE MÉCANISME EXISTANT.
 *
 * `players.test.ts` éprouve la transformation pure. Ici on éprouve ce qui
 * l'entoure et qui, seul, peut faire perdre des données : le marqueur de
 * version propre au registre (et non `mb_data_version`, dont le bump EFFACE
 * l'historique), la sauvegarde de l'ancienne liste avant retrait, et le fait
 * que la migration ne se rejoue pas.
 *
 * `storage.ts` joue sa migration AU CHARGEMENT DU MODULE : chaque cas doit
 * donc semer `localStorage` puis importer le module à neuf.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { storage as StorageApi } from './storage';
import { must } from './test/must';

/** Un historique d'avant les profils, tel qu'il dort dans `localStorage`. */
const LEGACY_HISTORY = [
  {
    id: 'm-2',
    completedAt: 1_756_000_000_000,
    config: {
      type: 'singles',
      sets: 2,
      points: 21,
      cap: null,
      sideChange: 'each-set',
      team1: { primary: 'Anass', id: 'A' },
      team2: { primary: 'Guillaume', id: 'B' },
    },
    setScores: [{ team1: 21, team2: 18 }],
    finalSetWins: { team1: 1, team2: 0 },
    winner: 'team1',
  },
  {
    id: 'm-1',
    completedAt: 1_755_000_000_000,
    config: {
      type: 'doubles',
      sets: 2,
      points: 21,
      cap: null,
      sideChange: 'each-set',
      team1: { primary: 'anass', partner: 'Zoé', id: 'A' },
      team2: { primary: 'Guillaume', partner: 'Léa', id: 'B' },
    },
    setScores: [{ team1: 15, team2: 21 }],
    finalSetWins: { team1: 0, team2: 1 },
    winner: 'team2',
  },
];

async function loadStorage(seed: {
  history?: unknown;
  playerNames?: unknown;
  players?: unknown;
  playersVersion?: string;
}): Promise<typeof StorageApi> {
  localStorage.clear();
  // `mb_data_version` doit valoir la version courante, sinon `runMigrations`
  // SAUVEGARDE PUIS EFFACE l'historique avant qu'on ait rien migré. C'est le
  // mécanisme en place, et on ne le contourne pas : on le respecte.
  localStorage.setItem('mb_data_version', '2');
  if (seed.history !== undefined) {
    localStorage.setItem('mb_match_history', JSON.stringify(seed.history));
  }
  if (seed.playerNames !== undefined) {
    localStorage.setItem('mb_player_names', JSON.stringify(seed.playerNames));
  }
  if (seed.players !== undefined) {
    localStorage.setItem('mb_players', JSON.stringify(seed.players));
  }
  if (seed.playersVersion !== undefined) {
    localStorage.setItem('mb_players_version', seed.playersVersion);
  }
  vi.resetModules();
  return (await import('./storage')).storage;
}

function readJson(key: string): unknown {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

describe('migration au chargement : noms → profils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('crée les profils, estampille les matchs, et laisse le reste en place', async () => {
    const storage = await loadStorage({
      history: LEGACY_HISTORY,
      playerNames: ['Anass', 'Guillaume', 'Nadia'],
    });

    const players = storage.loadPlayers();
    expect(players.map(p => p.name).sort()).toEqual([
      'Anass',
      'Guillaume',
      'Léa',
      'Nadia',
      'Zoé',
    ]);

    const history = storage.loadHistory();
    expect(history).toHaveLength(2);
    const simple = must(history[0], 'le simple');
    const double = must(history[1], 'le double');
    expect(simple.config.team1.primaryId).toBeTruthy();
    expect(double.config.team1.partnerId).toBeTruthy();
    // « Anass » et « anass » : un seul profil, donc un seul identifiant.
    expect(simple.config.team1.primaryId).toBe(double.config.team1.primaryId);
    // Les scores et les côtés n'ont pas bougé.
    expect(simple.setScores).toEqual([{ team1: 21, team2: 18 }]);
    expect(simple.config.team2.id).toBe('B');
  });

  it("sauvegarde l'ancienne liste de noms au lieu de l'effacer", async () => {
    await loadStorage({
      history: LEGACY_HISTORY,
      playerNames: ['Anass', 'Nadia'],
    });
    expect(localStorage.getItem('mb_player_names')).toBeNull();
    expect(readJson('mb_backup_vplayers_mb_player_names')).toEqual([
      'Anass',
      'Nadia',
    ]);
  });

  it("ne touche PAS à `mb_data_version` : l'historique n'est jamais wipé", async () => {
    const storage = await loadStorage({
      history: LEGACY_HISTORY,
      playerNames: ['Anass'],
    });
    expect(localStorage.getItem('mb_data_version')).toBe('2');
    expect(localStorage.getItem('mb_players_version')).toBe('1');
    expect(storage.loadHistory()).toHaveLength(2);
    // Le filet de sécurité du mécanisme existant n'a pas eu à se déclencher.
    expect(localStorage.getItem('mb_backup_v1_mb_match_history')).toBeNull();
  });

  it('ne se rejoue pas : les identifiants sont stables au rechargement', async () => {
    const first = await loadStorage({
      history: LEGACY_HISTORY,
      playerNames: ['Anass'],
    });
    const idsBefore = first.loadPlayers().map(p => p.id);
    const historyBefore = first.loadHistory();

    // Rechargement du module SANS vider `localStorage` : c'est ce que fait un
    // simple rafraîchissement de la page.
    vi.resetModules();
    const second = (await import('./storage')).storage;
    expect(second.loadPlayers().map(p => p.id)).toEqual(idsBefore);
    expect(second.loadHistory()).toEqual(historyBefore);
  });

  it('sur une donnée déjà migrée, ne crée rien', async () => {
    const storage = await loadStorage({
      history: [],
      players: [{ id: 'p1', name: 'Anass', createdAt: 1 }],
      playersVersion: '1',
    });
    expect(storage.loadPlayers()).toEqual([
      { id: 'p1', name: 'Anass', createdAt: 1 },
    ]);
  });

  it('une liste de noms corrompue est mise de côté, pas perdue', async () => {
    localStorage.clear();
    localStorage.setItem('mb_data_version', '2');
    localStorage.setItem('mb_player_names', '{"pas":"une liste"}');
    vi.resetModules();
    const storage = (await import('./storage')).storage;
    // Le garde du mécanisme existant : la donnée invalide part sous
    // `*_invalid_*` et la lecture retombe sur le défaut.
    expect(storage.loadPlayers()).toEqual([]);
    const backups = Object.keys(localStorage).filter(k =>
      k.startsWith('mb_player_names_invalid_')
    );
    expect(backups).toHaveLength(1);
  });
});

describe('renommer un joueur, depuis le stockage', () => {
  it("met à jour le registre ET l'historique", async () => {
    const storage = await loadStorage({
      history: LEGACY_HISTORY,
      playerNames: [],
    });
    const anass = must(
      storage.loadPlayers().find(p => p.name === 'Anass'),
      'le profil Anass'
    );

    expect(storage.renamePlayer(anass.id, '  Anass  B.  ')).toBe('ok');
    expect(storage.loadPlayers().find(p => p.id === anass.id)?.name).toBe(
      'Anass B.'
    );
    const history = storage.loadHistory();
    const simple = must(history[0], 'le simple');
    const double = must(history[1], 'le double');
    expect(simple.config.team1.primary).toBe('Anass B.');
    expect(double.config.team1.primary).toBe('Anass B.');
    // L'identifiant, lui, n'a pas bougé : c'est tout l'intérêt.
    expect(simple.config.team1.primaryId).toBe(anass.id);
    // Et l'adversaire n'a pas été touché.
    expect(simple.config.team2.primary).toBe('Guillaume');
  });

  it('refuse un nom vide, un profil inconnu, et un doublon', async () => {
    const storage = await loadStorage({
      history: LEGACY_HISTORY,
      playerNames: [],
    });
    const anass = storage.loadPlayers().find(p => p.name === 'Anass')!;
    expect(storage.renamePlayer(anass.id, '   ')).toBe('empty');
    expect(storage.renamePlayer('inconnu', 'Peu importe')).toBe('unknown');
    // Fusionner deux profils en leur donnant le même nom serait bien plus
    // dur à défaire qu'un refus.
    expect(storage.renamePlayer(anass.id, 'guillaume')).toBe('duplicate');
    expect(storage.loadPlayers().find(p => p.id === anass.id)?.name).toBe(
      'Anass'
    );
  });
});

describe('rememberPlayer', () => {
  it('réutilise le profil quand le nom est déjà connu', async () => {
    const storage = await loadStorage({ history: [], playerNames: ['Anass'] });
    const first = storage.rememberPlayer('Anass');
    const again = storage.rememberPlayer('  anass ');
    expect(first?.id).toBe(again?.id);
    expect(storage.loadPlayers()).toHaveLength(1);
  });

  it('ignore un nom vide', async () => {
    const storage = await loadStorage({ history: [], playerNames: [] });
    expect(storage.rememberPlayer('   ')).toBeNull();
    expect(storage.loadPlayers()).toHaveLength(0);
  });
});
