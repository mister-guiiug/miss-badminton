/**
 * L'ÉCHANGE DU CODE OAuth — côté proxy.
 *
 * « Se connecter avec MyFFBaD » suit le flux OAuth 2.0 standard
 * (Authorization Code + PKCE, RFC 6749 et RFC 7636) :
 *  1. l'application envoie l'utilisateur s'identifier SUR LE SITE DE LA
 *     FFBaD — elle ne voit jamais son mot de passe ;
 *  2. la FFBaD le renvoie vers l'application avec un `code` à usage unique ;
 *  3. l'application confie ce code au proxy, qui l'échange contre un jeton
 *     d'accès auprès du point de jeton de la FFBaD (avec le secret client
 *     s'il y en a un — il ne quitte jamais le serveur) ;
 *  4. l'application présente ensuite ce jeton au proxy pour lire les
 *     tournois de l'utilisateur.
 *
 * L'échange (étape 3) est STANDARDISÉ : il ne dépend que de l'adresse du
 * point de jeton et de l'identifiant client que la FFBaD délivrera en
 * enregistrant l'application. Rien ici n'est propre à une API devinée.
 */
import { UpstreamNotConfiguredError } from './upstream';

export interface CodeExchangeRequest {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface TokenResponse {
  accessToken: string;
  /** Durée de vie en secondes, si le fournisseur la donne. */
  expiresIn?: number;
}

export interface OAuthExchanger {
  exchange(request: CodeExchangeRequest): Promise<TokenResponse>;
}

/** Le fournisseur a refusé le code (expiré, déjà utilisé, mauvais vérificateur). */
export class OAuthExchangeError extends Error {
  constructor() {
    super('oauth-exchange');
    this.name = 'OAuthExchangeError';
  }
}

export interface OAuthEnv {
  FFBAD_OAUTH_TOKEN_URL?: string;
  FFBAD_OAUTH_CLIENT_ID?: string;
  /** Facultatif : seulement si la FFBaD délivre un client confidentiel. */
  FFBAD_OAUTH_CLIENT_SECRET?: string;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** L'échange auprès d'un point de jeton OAuth 2.0 conforme. */
export function createTokenEndpointExchanger(
  env: OAuthEnv,
  fetchImpl: FetchLike = (input, init) => fetch(input, init)
): OAuthExchanger {
  return {
    async exchange({ code, codeVerifier, redirectUri }) {
      const tokenUrl = env.FFBAD_OAUTH_TOKEN_URL?.trim();
      const clientId = env.FFBAD_OAUTH_CLIENT_ID?.trim();
      if (!tokenUrl || !clientId) {
        throw new UpstreamNotConfiguredError(
          'Client OAuth FFBaD absent (FFBAD_OAUTH_TOKEN_URL, FFBAD_OAUTH_CLIENT_ID).'
        );
      }
      const form = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
      });
      const secret = env.FFBAD_OAUTH_CLIENT_SECRET?.trim();
      if (secret) form.set('client_secret', secret);

      const response = await fetchImpl(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: form.toString(),
      });
      if (response.status === 400 || response.status === 401) {
        throw new OAuthExchangeError();
      }
      if (!response.ok) throw new Error('token-endpoint');
      const body = (await response.json()) as {
        access_token?: unknown;
        expires_in?: unknown;
      };
      if (typeof body.access_token !== 'string' || !body.access_token) {
        throw new Error('token-endpoint');
      }
      return {
        accessToken: body.access_token,
        expiresIn:
          typeof body.expires_in === 'number' ? body.expires_in : undefined,
      };
    },
  };
}

/** Le fournisseur de démonstration : `mock-code` vaut `mock-token`. */
export function createMockExchanger(): OAuthExchanger {
  return {
    exchange({ code }) {
      if (code !== 'mock-code') return Promise.reject(new OAuthExchangeError());
      return Promise.resolve({ accessToken: 'mock-token', expiresIn: 3600 });
    },
  };
}
