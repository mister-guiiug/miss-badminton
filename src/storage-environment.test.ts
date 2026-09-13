/**
 * Ce que l'environnement de test doit fournir AVANT qu'un test de persistance
 * veuille dire quelque chose : le `Storage` du navigateur, pas une imitation.
 *
 * C'est le test qui manquait le 13/09/2026. `players-storage.test.ts` lisait
 * les clés par `Object.keys(localStorage)` ; sous Node 26 la suite tournait
 * contre un objet adossé à une `Map` — interface honorée, objet exotique non —
 * et cette lecture rendait les noms des méthodes au lieu des données. Le test
 * de migration est tombé pour une raison qui ne le concernait pas, et la piste
 * ne menait qu'à lui. La cause a maintenant son propre test : s'il repasse au
 * rouge, il dit lui-même ce qui a cédé.
 *
 * Le rattrapage est dans `src/test/setup.ts`, qui porte le détail de la chaîne.
 */
import { describe, expect, it } from 'vitest';

/** L'objet `Storage` vu comme un sac de propriétés nommées, ce qu'il est. */
function asRecord(storage: Storage): Record<string, unknown> {
  return storage as unknown as Record<string, unknown>;
}

const CAS = [
  { nom: 'localStorage', get: (): Storage => localStorage },
  { nom: 'sessionStorage', get: (): Storage => sessionStorage },
];

for (const { nom, get } of CAS) {
  describe(`${nom} est celui de jsdom`, () => {
    it('expose ses clés comme propriétés énumérables', () => {
      const storage = get();
      storage.clear();
      storage.setItem('mb_sonde', 'présente');

      // Les trois lectures qu'un navigateur sait faire et qu'une imitation
      // adossée à une `Map` ne sait pas.
      expect(Object.keys(storage)).toEqual(['mb_sonde']);
      expect(asRecord(storage).mb_sonde).toBe('présente');
      expect({ ...storage }).toEqual({ mb_sonde: 'présente' });

      storage.clear();
      expect(Object.keys(storage)).toEqual([]);
    });

    it("n'est pas le secours du socle, qui énumère ses méthodes", () => {
      // L'échec exact du 13/09 : `Object.keys` rendait
      // ['length','key','getItem','setItem','removeItem','clear'].
      expect(Object.keys(get())).not.toContain('getItem');
    });
  });
}
