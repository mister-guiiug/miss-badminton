// Setup Vitest partagé : jest-dom + stub matchMedia + mocks virtual:pwa-register.
import '@mister-guiiug/dev-pwa-config/vitest-setup';

/*
 * Rendre à `localStorage`/`sessionStorage` l'implémentation de jsdom.
 *
 * Depuis le passage à Node 26 (#47), la CI Linux échouait sur
 * `players-storage.test.ts` — « expected [] to have a length of 1 » — pendant
 * que la même suite restait verte en local sous Node 24. La CI n'était pas
 * instable : elle était rouge à tous les coups depuis ce commit, et la course
 * verte de chaque commit venait du workflow *Deploy*, qui ne joue aucun test
 * unitaire.
 *
 * La chaîne :
 *
 *  1. Node 26 pose lui-même un `localStorage` sur `globalThis`. Sans
 *     `--localstorage-file` il se contente d'avertir (« localStorage is not
 *     available… », visible dans le journal de CI) et rend `undefined` — mais
 *     la PROPRIÉTÉ, elle, existe.
 *  2. `populateGlobal` de Vitest ne copie une clé de la fenêtre jsdom que si
 *     elle n'est pas déjà sur `globalThis` (`if (k in global) return
 *     keysArray.includes(k)`), et ni `localStorage` ni `sessionStorage` ne
 *     figurent dans sa liste d'exceptions. Le vrai `Storage` de jsdom n'arrive
 *     donc jamais jusqu'aux tests.
 *  3. `vitest-setup` du socle voit alors `undefined`, et installe son secours :
 *     un objet ordinaire adossé à une `Map`. Il honore l'INTERFACE
 *     (`getItem`, `setItem`, `length`, `key`), pas l'objet exotique :
 *     `localStorage.maClé`, `Object.keys(localStorage)` et `{ ...localStorage }`
 *     ne voient plus les données stockées, mais les noms des méthodes.
 *
 * Aucune de ces trois étapes ne dit un mot. Toute la suite s'est mise à
 * éprouver une `Map` au lieu du stockage du navigateur, et le seul test qui
 * lisait les clés autrement que par `getItem` est tombé.
 *
 * Le vrai stockage n'a jamais été loin : l'environnement jsdom de Vitest laisse
 * son instance sur `globalThis.jsdom` (et la retire à la fermeture). On la
 * reprend ici, APRÈS le setup du socle, donc en remplaçant son secours.
 *
 * À faire remonter au socle (`dev-pwa-config/vitest-setup.js`) : les 20 dépôts
 * de la famille tournent sur Node 26 avec le même faux stockage sans le savoir.
 * Ce bloc restera sans effet le jour où le socle le fera lui-même — il ne pose
 * rien quand ce qui est en place est déjà celui de jsdom.
 */
type WebStorageName = 'localStorage' | 'sessionStorage';

function restoreJsdomStorage(name: WebStorageName): void {
  const dom = (globalThis as { jsdom?: { window?: Partial<Window> } }).jsdom;
  const real = dom?.window?.[name];
  // Pas d'environnement jsdom sous la main (pool VM, autre `environment`) :
  // on laisse en place ce que le socle a installé, quel qu'il soit.
  if (!real || typeof real.getItem !== 'function') return;
  if (globalThis[name] === real) return;
  Object.defineProperty(globalThis, name, {
    value: real,
    writable: true,
    configurable: true,
  });
}

restoreJsdomStorage('localStorage');
restoreJsdomStorage('sessionStorage');
