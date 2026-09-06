/**
 * Compatibilité IndexedDB : l'adoption de `createIdb` du socle ne doit pas
 * couper les utilisateurs existants de leurs données. L'ancien wrapper local
 * (`src/idb.ts`, supprimé) créait la base `miss-badminton` en version 1 avec
 * un unique object-store `kv` ; le socle ouvre la même base, même version,
 * même store. On le prouve en recréant ici une base « héritée » à l'identique,
 * puis en lisant au travers du socle et de `storage`.
 */
import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { createIdb } from '@mister-guiiug/dev-pwa-config/idb';
import { storage, type SavedMatch } from './storage';
import { must } from './test/must';

const legacyMatch: SavedMatch = {
  id: 'legacy-1',
  completedAt: 1717000000000,
  config: {
    type: 'singles',
    sets: 3,
    points: 21,
    cap: 30,
    sideChange: 'each-set',
    team1: { primary: 'Alice' },
    team2: { primary: 'Bob' },
  },
  setScores: [
    { team1: 21, team2: 15 },
    { team1: 21, team2: 18 },
  ],
  finalSetWins: { team1: 2, team2: 0 },
  winner: 'team1',
};

/**
 * Recrée la base telle que l'ancien wrapper local la laissait chez les
 * utilisateurs : version 1, store `kv` SEUL (pas de `blobs`), l'historique
 * rangé sous la clé `history`.
 */
function seedLegacyDb(history: SavedMatch[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('miss-badminton', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('kv');
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(history, 'history');
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error ?? new Error('transaction en échec'));
    };
    req.onerror = () => reject(req.error ?? new Error('ouverture en échec'));
  });
}

describe('compatibilité IndexedDB avec la base du wrapper local supprimé', () => {
  beforeAll(async () => {
    await seedLegacyDb([legacyMatch]);
  });

  it('createIdb ouvre la base existante et lit le store `kv` tel quel', async () => {
    const idb = createIdb('miss-badminton');
    expect(await idb.available()).toBe(true);
    expect(await idb.get('history')).toEqual([legacyMatch]);
    await idb.close();
  });

  it("storage.loadHistoryAsync restitue l'historique hérité", async () => {
    const history = await storage.loadHistoryAsync();
    // Le match hérité revient INTACT — à ceci près que l'hydratation joue
    // au passage la migration des profils joueurs, qui POSE des
    // identifiants sur les matchs qui n'en portent pas (cf. `players.ts`).
    // C'est le seul écart, et il est additif : rien du match d'origine n'a
    // été perdu ni réécrit.
    expect(history).toHaveLength(1);
    const got = must(history[0], 'le match hérité');
    expect({
      ...got,
      config: {
        ...got.config,
        team1: { primary: got.config.team1.primary },
        team2: { primary: got.config.team2.primary },
      },
    }).toEqual(legacyMatch);
    expect(got.config.team1.primaryId).toEqual(expect.any(String));
    expect(got.config.team2.primaryId).toEqual(expect.any(String));
    expect(got.config.team1.primaryId).not.toBe(got.config.team2.primaryId);
  });

  it('les API blob ne lèvent pas sur une base héritée sans store `blobs`', async () => {
    // Ouverte en version 1 = 1, la base héritée ne passe jamais par
    // `onupgradeneeded` : pas de store `blobs`. Le contrat « rien ne lève »
    // du socle doit tenir quand même.
    const idb = createIdb('miss-badminton');
    await expect(idb.getBlob('avatar')).resolves.toBeUndefined();
    await expect(idb.setBlob('avatar', new Blob(['x']))).resolves.toBe(false);
    await idb.close();
  });

  it("l'écriture dans `kv` continue de fonctionner sur la base héritée", async () => {
    const idb = createIdb('miss-badminton');
    expect(await idb.set('probe', { ok: true })).toBe(true);
    expect(await idb.get('probe')).toEqual({ ok: true });
    expect(await idb.remove('probe')).toBe(true);
    expect(await idb.get('probe')).toBeUndefined();
    await idb.close();
  });
});
