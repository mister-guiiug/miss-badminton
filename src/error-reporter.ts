/**
 * Error reporter local, sans dépendance externe.
 *
 * Pourquoi pas Sentry / Highlight directement ? L'app est offline-first et
 * stocke tout en local — ajouter une dépendance ~200 KB + un endpoint
 * externe pour quelques erreurs occasionnelles est disproportionné.
 *
 * Approche :
 *  - On capture les `error` et `unhandledrejection` du window
 *  - On stocke un anneau de 50 entrées dans localStorage (`mb_error_log`)
 *  - L'utilisateur peut les exporter depuis Settings → Diagnostics
 *  - Aucun envoi réseau par défaut ; un hook `setForwarder(fn)` permet
 *    d'envoyer à un endpoint custom si voulu (ex. Sentry via SDK natif
 *    branché plus tard)
 */

const LOG_KEY = 'mb_error_log';
const MAX_ENTRIES = 50;

export interface ErrorEntry {
  at: number;
  message: string;
  stack?: string;
  source?: string;
  url: string;
  userAgent: string;
}

type Forwarder = (entry: ErrorEntry) => void;

let forwarder: Forwarder | null = null;

function read(): ErrorEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: ErrorEntry[]): void {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* ignore quota */
  }
}

export function logError(
  entry: Omit<ErrorEntry, 'at' | 'url' | 'userAgent'>
): void {
  const full: ErrorEntry = {
    ...entry,
    at: Date.now(),
    url: typeof window === 'undefined' ? '' : window.location.href,
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
  };
  const next = [...read(), full];
  persist(next);
  if (forwarder) {
    try {
      forwarder(full);
    } catch {
      /* never break the logger because the forwarder threw */
    }
  }
  // Aide au debug en dev sans polluer la console en prod.
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn('[mb-error]', full.message, full.stack ?? '');
  }
}

export function getErrorLog(): ErrorEntry[] {
  return read();
}

export function clearErrorLog(): void {
  try {
    localStorage.removeItem(LOG_KEY);
  } catch {
    /* ignore */
  }
}

export function setForwarder(fn: Forwarder | null): void {
  forwarder = fn;
}

let installed = false;
export function installErrorReporter(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', e => {
    logError({
      message: e.message || 'window.onerror',
      stack: e.error?.stack,
      source: e.filename,
    });
  });
  window.addEventListener('unhandledrejection', e => {
    const reason = e.reason as unknown;
    let message = 'unhandledrejection';
    let stack: string | undefined;
    if (reason instanceof Error) {
      message = reason.message;
      stack = reason.stack;
    } else if (typeof reason === 'string') {
      message = reason;
    } else {
      try {
        message = JSON.stringify(reason);
      } catch {
        /* ignore */
      }
    }
    logError({ message, stack, source: 'unhandledrejection' });
  });
}
