/**
 * « SE CONNECTER AVEC MyFFBaD » — le flux OAuth 2.0 côté application.
 *
 * Authorization Code + PKCE (RFC 6749, RFC 7636), le flux recommandé pour une
 * application sans serveur :
 *  - l'utilisateur s'identifie SUR LE SITE DE LA FFBaD : Miss Badminton ne
 *    voit, ne demande ni ne stocke jamais son mot de passe ;
 *  - le `state` aléatoire, vérifié au retour, empêche qu'un tiers glisse son
 *    propre code dans la session (CSRF) ;
 *  - le vérificateur PKCE, gardé dans l'onglet, rend un code intercepté
 *    inutilisable par un autre ;
 *  - le code est échangé par le PROXY (`ebad-proxy/oauth.ts`), qui garde le
 *    secret client s'il y en a un ;
 *  - le jeton vit dans `sessionStorage` : il disparaît avec l'onglet, et la
 *    CSP stricte de l'app limite ce qu'un script injecté pourrait en faire.
 *
 * L'ADRESSE DE RETOUR EST LA RACINE DE L'APP, pas `/tournois` : GitHub Pages
 * n'a pas de page de secours, une arrivée directe sur une sous-page y rend
 * une 404. La racine repère le retour (`isOAuthCallback`) et renvoie vers
 * `/tournois`, qui termine la connexion.
 *
 * Module sans dépendance (pas de zod, pas de React) : la détection du retour
 * est chargée avec l'accueil, elle doit rester légère.
 *
 * Interrupteurs (publics, aucun secret) : `VITE_EBAD_OAUTH_AUTHORIZE_URL`
 * et `VITE_EBAD_OAUTH_CLIENT_ID`, plus `VITE_EBAD_OAUTH_SCOPE` (facultatif).
 * `mock` comme adresse simule le fournisseur, en développement seulement.
 */

const PENDING_KEY = 'mb_ebad_oauth_pending';
const TOKEN_KEY = 'mb_ebad_oauth_token';
/** Un retour plus tardif que ça n'est plus celui qu'on attendait. */
const PENDING_MAX_AGE_MS = 10 * 60 * 1000;

export interface OAuthConfig {
  /** `mock` : fournisseur simulé (développement). */
  authorizeUrl: string;
  clientId: string;
  scope: string;
  redirectUri: string;
}

interface Pending {
  state: string;
  verifier: string;
  createdAt: number;
}

interface StoredToken {
  accessToken: string;
  /** Horodatage d'expiration, ou `null` si le fournisseur n'en donne pas. */
  expiresAt: number | null;
}

function session(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string): T | null {
  try {
    const raw = session()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    session()?.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : la connexion ne survivra pas au retour */
  }
}

function remove(key: string): void {
  try {
    session()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** L'adresse de retour : la racine de l'app sur cette origine. */
export function appRedirectUri(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}

/** La configuration OAuth posée au build, ou `null` : pas de connexion. */
export function configuredOAuth(): OAuthConfig | null {
  const authorizeUrl = (
    import.meta.env.VITE_EBAD_OAUTH_AUTHORIZE_URL ?? ''
  ).trim();
  const clientId = (import.meta.env.VITE_EBAD_OAUTH_CLIENT_ID ?? '').trim();
  if (!authorizeUrl) return null;
  if (authorizeUrl === 'mock') {
    if (!import.meta.env.DEV) return null;
  } else if (!clientId) {
    return null;
  }
  return {
    authorizeUrl,
    clientId: clientId || 'mock-client',
    scope: (import.meta.env.VITE_EBAD_OAUTH_SCOPE ?? '').trim(),
    redirectUri: appRedirectUri(),
  };
}

/** Octets → base64url sans remplissage (RFC 4648 §5). */
export function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Une chaîne aléatoire sûre : 32 octets, 43 caractères base64url. */
export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

/** Le défi PKCE `S256` d'un vérificateur. */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  );
  return base64Url(new Uint8Array(digest));
}

/** L'adresse d'autorisation, paramètres OAuth et PKCE compris. */
export function buildAuthorizeUrl(
  config: OAuthConfig,
  state: string,
  challenge: string
): string {
  const url = new URL(config.authorizeUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  if (config.scope) url.searchParams.set('scope', config.scope);
  return url.toString();
}

/**
 * Lance la connexion : mémorise `state` et vérificateur dans l'onglet, puis
 * rend l'adresse où envoyer l'utilisateur. Avec `mock`, cette adresse est
 * directement le retour, code de démonstration compris.
 */
export async function beginLogin(
  config: OAuthConfig,
  now: number = Date.now()
): Promise<string> {
  const pending: Pending = {
    state: randomToken(),
    verifier: randomToken(),
    createdAt: now,
  };
  writeJson(PENDING_KEY, pending);
  if (config.authorizeUrl === 'mock') {
    const back = new URL(config.redirectUri);
    back.searchParams.set('code', 'mock-code');
    back.searchParams.set('state', pending.state);
    return back.toString();
  }
  return buildAuthorizeUrl(
    config,
    pending.state,
    await pkceChallenge(pending.verifier)
  );
}

/** L'adresse porte-t-elle un retour OAuth que cet onglet attend ? */
export function isOAuthCallback(search: string): boolean {
  const params = new URLSearchParams(search);
  return (
    (params.has('code') || params.has('error')) &&
    params.has('state') &&
    readJson<Pending>(PENDING_KEY) !== null
  );
}

export type LoginOutcome = 'ok' | 'denied' | 'state' | 'expired' | 'error';

/**
 * Termine la connexion : vérifie `state` et l'âge de la demande, fait
 * échanger le code, garde le jeton. La demande en attente est consommée
 * dans tous les cas — un code ne se rejoue pas.
 */
export async function completeLogin(
  search: string,
  exchange: (request: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }) => Promise<{ access_token: string; expires_in?: number }>,
  redirectUri: string,
  now: number = Date.now()
): Promise<LoginOutcome> {
  const params = new URLSearchParams(search);
  const pending = readJson<Pending>(PENDING_KEY);
  remove(PENDING_KEY);
  if (!pending || params.get('state') !== pending.state) return 'state';
  if (now - pending.createdAt > PENDING_MAX_AGE_MS) return 'expired';
  if (params.has('error')) return 'denied';
  const code = params.get('code');
  if (!code) return 'error';
  try {
    const token = await exchange({
      code,
      codeVerifier: pending.verifier,
      redirectUri,
    });
    const stored: StoredToken = {
      accessToken: token.access_token,
      expiresAt:
        typeof token.expires_in === 'number'
          ? now + token.expires_in * 1000
          : null,
    };
    writeJson(TOKEN_KEY, stored);
    return 'ok';
  } catch {
    return 'error';
  }
}

/** Le jeton courant, ou `null` (absent, ou expiré — il est alors oublié). */
export function currentAccessToken(now: number = Date.now()): string | null {
  const token = readJson<StoredToken>(TOKEN_KEY);
  if (!token || typeof token.accessToken !== 'string') return null;
  if (token.expiresAt !== null && token.expiresAt <= now) {
    remove(TOKEN_KEY);
    return null;
  }
  return token.accessToken;
}

/** Oublie le jeton (déconnexion, ou jeton refusé par le proxy). */
export function logout(): void {
  remove(TOKEN_KEY);
}

/** Les paramètres OAuth retirés d'une adresse, pour nettoyer l'historique. */
export function stripOAuthParams(href: string): string {
  const url = new URL(href);
  for (const key of ['code', 'state', 'error', 'error_description', 'iss']) {
    url.searchParams.delete(key);
  }
  return url.toString();
}
