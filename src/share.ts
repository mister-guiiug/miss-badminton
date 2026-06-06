/// <reference types="node" />
// ^ `Buffer` (branche non-navigateur de buildReplayUrl) : type-only, aucun effet
//   runtime. Nécessaire depuis Vite 8 (vite/client n'inclut plus les globals Node).
import type { SavedMatch } from './storage';

/**
 * Construit le texte partagé pour un match terminé. La forme reste
 * volontairement simple — Web Share / clipboard / SMS / email gèrent du
 * texte brut. Pour un partage plus riche (image), voir `shareMatchImage`.
 */
export function buildShareText(
  match: SavedMatch,
  labels: {
    team1: string;
    team2: string;
    template: (params: {
      a: string;
      sa: number;
      sb: number;
      b: string;
      sets: string;
    }) => string;
  }
): string {
  const setsText = match.setScores.map(s => `${s.team1}-${s.team2}`).join(', ');
  return labels.template({
    a: labels.team1,
    sa: match.finalSetWins.team1,
    sb: match.finalSetWins.team2,
    b: labels.team2,
    sets: setsText,
  });
}

/** Wrapper Web Share / clipboard ; ne lève jamais. */
export async function shareText(title: string, text: string): Promise<void> {
  const nav: Navigator | undefined =
    typeof navigator === 'undefined' ? undefined : navigator;
  try {
    if (nav && typeof nav.share === 'function') {
      await nav.share({ title, text });
      return;
    }
    if (nav && typeof nav.clipboard?.writeText === 'function') {
      await nav.clipboard.writeText(text);
      return;
    }
  } catch {
    /* l'utilisateur a annulé ou la cible n'est pas disponible — silencieux */
  }
}

/**
 * Encode un MatchConfig dans une URL "replay" partageable. Le destinataire
 * qui ouvre le lien atterrit sur la home avec le wizard pré-rempli.
 */
export function buildReplayUrl(config: SavedMatch['config']): string {
  try {
    const json = JSON.stringify(config);
    // btoa ne gère pas UTF-8 directement (les noms peuvent contenir accents).
    const utf8Safe =
      typeof window === 'undefined'
        ? Buffer.from(json, 'utf-8').toString('base64')
        : btoa(unescape(encodeURIComponent(json)));
    const base =
      typeof window === 'undefined'
        ? 'https://example.com/'
        : window.location.origin +
          window.location.pathname.replace(/\/[^/]*$/, '/');
    return `${base}?replay=${encodeURIComponent(utf8Safe)}`;
  } catch {
    return '';
  }
}

export function readReplayFromUrl(): SavedMatch['config'] | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get('replay');
    if (!raw) return null;
    const json = decodeURIComponent(escape(atob(decodeURIComponent(raw))));
    const parsed = JSON.parse(json);
    // Validation légère ; le store / wizard valideront plus loin via zod.
    if (
      parsed &&
      typeof parsed === 'object' &&
      'type' in parsed &&
      'sets' in parsed
    ) {
      return parsed as SavedMatch['config'];
    }
    return null;
  } catch {
    return null;
  }
}
