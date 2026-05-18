/**
 * Wrapper IndexedDB minimaliste pour `mb_match_history`. Pas de dépendance
 * externe — on n'a besoin que d'un object-store clé/valeur.
 *
 * Stratégie d'usage : IndexedDB est la source de vérité pour l'historique
 * complet (sans plafond). `storage.ts` conserve une copie en localStorage
 * limitée à `MAX_HISTORY` entrées pour permettre une lecture synchrone à
 * l'init du store (avant que la promesse IDB ne résolve).
 */

const DB_NAME = 'miss-badminton';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }
  dbPromise = new Promise<IDBDatabase | null>(resolve => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise<T | undefined>(resolve => {
    try {
      const req = tx(db, 'readonly').get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function idbSet<T>(key: string, value: T): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise<boolean>(resolve => {
    try {
      const req = tx(db, 'readwrite').put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbDel(key: string): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise<boolean>(resolve => {
    try {
      const req = tx(db, 'readwrite').delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
