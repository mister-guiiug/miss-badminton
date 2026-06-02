/** Liens externes de l'application (source, sponsor) et URL partageable. */
export const REPO_URL = 'https://github.com/mister-guiiug/miss-badminton';
export const SPONSOR_URL = 'https://buymeacoffee.com/mister.guiiug';

/**
 * URL canonique de l'app à partager : racine du déploiement (gère le base
 * path GitHub Pages). Repli sur l'URL Pages connue hors navigateur.
 */
export function appUrl(): string {
  try {
    const base = import.meta.env.BASE_URL || '/';
    return new URL(base, globalThis.location.origin).href;
  } catch {
    return 'https://mister-guiiug.github.io/miss-badminton/';
  }
}
