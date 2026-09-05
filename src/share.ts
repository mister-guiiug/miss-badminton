/// <reference types="node" />
// ^ `Buffer` (branche non-navigateur de buildReplayUrl) : type-only, aucun effet
//   runtime. Nécessaire depuis Vite 8 (vite/client n'inclut plus les globals Node).
import { currentAppUrl } from '@mister-guiiug/dev-pwa-config/share';
import type { SavedMatch } from './storage';

/**
 * CE QUI RESTE ICI est propre à Miss Badminton : la mise en forme d'un score,
 * et l'encodage d'une configuration de match dans une URL « replay ».
 *
 * `shareText()` a disparu au profit de `shareOrCopy` du socle. Ce n'était pas
 * un simple doublon : il PERDAIT le texte. Son `try` couvrait les deux
 * branches, si bien qu'un `navigator.share` présent mais qui échoue — refus de
 * la plateforme, geste utilisateur expiré — sautait le repli presse-papiers.
 * L'utilisateur ne partageait rien, ne copiait rien, et ne voyait rien.
 * `shareOrCopy` ne saute le repli que sur `AbortError`, c'est-à-dire quand
 * l'utilisateur a fermé la feuille lui-même, et le dit (`'cancelled'`) au lieu
 * de se taire.
 */

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
    // `currentAppUrl()` du socle : la racine du déploiement lue à sa source,
    // `import.meta.env.BASE_URL` — la même valeur que `AppRouter` donne pour
    // `basename`. Le calcul maison la DEVINAIT en coupant le dernier segment
    // de `location.pathname` : il tombe juste tant que toutes les routes sont
    // à un seul niveau (c'est le cas aujourd'hui), et cesse de tomber juste le
    // jour où l'une d'elles en compte deux. Aucun changement de comportement
    // ici, une dépendance de moins à la forme des routes.
    const base =
      typeof window === 'undefined' ? 'https://example.com/' : currentAppUrl();
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
