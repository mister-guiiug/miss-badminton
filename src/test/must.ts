/**
 * `must(x)` — l'élément attendu, ou un échec net.
 *
 * `noUncheckedIndexedAccess` est actif : `history[0]` a le type
 * `T | undefined`, et un `expect(...).toBeDefined()` ne rétrécit pas ce type
 * pour la ligne suivante. Deux issues : l'assertion non nulle (`!`), qui
 * cache le cas, ou cette fonction, qui l'échoue avec un message. Un test qui
 * lit un élément absent doit tomber en le DISANT, pas sur un
 * « cannot read property of undefined ».
 */
export function must<T>(value: T | undefined | null, what = 'valeur'): T {
  if (value === undefined || value === null) {
    throw new Error(`${what} : attendue, absente`);
  }
  return value;
}
