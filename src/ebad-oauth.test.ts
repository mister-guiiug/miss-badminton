import { beforeEach, describe, expect, it } from 'vitest';
import {
  base64Url,
  beginLogin,
  buildAuthorizeUrl,
  completeLogin,
  currentAccessToken,
  isOAuthCallback,
  logout,
  pkceChallenge,
  stripOAuthParams,
  type OAuthConfig,
} from './ebad-oauth';

const CONFIG: OAuthConfig = {
  authorizeUrl: 'https://auth.example/authorize',
  clientId: 'miss-badminton',
  scope: 'tournaments:read',
  redirectUri: 'https://mister-guiiug.github.io/miss-badminton/',
};

const MOCK: OAuthConfig = { ...CONFIG, authorizeUrl: 'mock' };

beforeEach(() => {
  sessionStorage.clear();
});

describe('PKCE', () => {
  it('le défi S256 du vecteur de la RFC 7636', async () => {
    expect(
      await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')
    ).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('base64url sans remplissage', () => {
    expect(base64Url(new Uint8Array([251, 255, 254]))).toBe('-__-');
    expect(base64Url(new Uint8Array([1]))).toBe('AQ');
  });
});

describe('l’adresse d’autorisation', () => {
  it('porte les paramètres OAuth et PKCE', () => {
    const url = new URL(buildAuthorizeUrl(CONFIG, 'st', 'ch'));
    expect(url.origin + url.pathname).toBe('https://auth.example/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'miss-badminton',
      redirect_uri: CONFIG.redirectUri,
      state: 'st',
      code_challenge: 'ch',
      code_challenge_method: 'S256',
      scope: 'tournaments:read',
    });
  });

  it('beginLogin mémorise un state, et le retient dans l’adresse', async () => {
    const url = new URL(await beginLogin(CONFIG));
    const state = url.searchParams.get('state');
    expect(state).toMatch(/^[\w-]{43}$/);
    expect(url.searchParams.get('code_challenge')).toMatch(/^[\w-]{43}$/);
    expect(isOAuthCallback(`?code=abc&state=${state}`)).toBe(true);
  });
});

describe('le retour', () => {
  async function retourMock(): Promise<string> {
    return new URL(await beginLogin(MOCK)).search;
  }

  it('n’est suivi que s’il est attendu par cet onglet', () => {
    expect(isOAuthCallback('?code=abc&state=xyz')).toBe(false);
    expect(isOAuthCallback('?replay=abc')).toBe(false);
  });

  it('échange le code, garde le jeton, consomme la demande', async () => {
    const search = await retourMock();
    let seen: { code: string; codeVerifier: string } | null = null;
    const outcome = await completeLogin(
      search,
      req => {
        seen = req;
        return Promise.resolve({ access_token: 'tok', expires_in: 60 });
      },
      CONFIG.redirectUri,
      1_000
    );
    expect(outcome).toBe('ok');
    expect(seen).toMatchObject({ code: 'mock-code' });
    expect(currentAccessToken(1_000 + 59_000)).toBe('tok');
    // La demande est consommée : le même retour ne se rejoue pas.
    expect(isOAuthCallback(search)).toBe(false);
  });

  it('refuse un state qui ne correspond pas', async () => {
    await retourMock();
    const outcome = await completeLogin(
      '?code=mock-code&state=autre',
      () => Promise.resolve({ access_token: 'tok' }),
      CONFIG.redirectUri
    );
    expect(outcome).toBe('state');
    expect(currentAccessToken()).toBeNull();
  });

  it('refuse une demande trop ancienne', async () => {
    const search = new URL(await beginLogin(MOCK, 0)).search;
    const outcome = await completeLogin(
      search,
      () => Promise.resolve({ access_token: 'tok' }),
      CONFIG.redirectUri,
      11 * 60 * 1000
    );
    expect(outcome).toBe('expired');
  });

  it('rapporte un refus de l’utilisateur', async () => {
    const search = await retourMock();
    const state = new URLSearchParams(search).get('state');
    const outcome = await completeLogin(
      `?error=access_denied&state=${state}`,
      () => Promise.resolve({ access_token: 'tok' }),
      CONFIG.redirectUri
    );
    expect(outcome).toBe('denied');
  });

  it('un échange refusé est une erreur, sans jeton', async () => {
    const search = await retourMock();
    const outcome = await completeLogin(
      search,
      () => Promise.reject(new Error('401')),
      CONFIG.redirectUri
    );
    expect(outcome).toBe('error');
    expect(currentAccessToken()).toBeNull();
  });
});

describe('le jeton', () => {
  it('expiré, il est oublié ; la déconnexion l’efface', async () => {
    const search = new URL(await beginLogin(MOCK, 0)).search;
    await completeLogin(
      search,
      () => Promise.resolve({ access_token: 'tok', expires_in: 10 }),
      CONFIG.redirectUri,
      0
    );
    expect(currentAccessToken(9_000)).toBe('tok');
    expect(currentAccessToken(10_000)).toBeNull();

    const again = new URL(await beginLogin(MOCK, 0)).search;
    await completeLogin(
      again,
      () => Promise.resolve({ access_token: 'tok2' }),
      CONFIG.redirectUri,
      0
    );
    expect(currentAccessToken()).toBe('tok2');
    logout();
    expect(currentAccessToken()).toBeNull();
  });

  it('les paramètres OAuth sont retirés de l’adresse', () => {
    expect(
      stripOAuthParams('https://x.example/app/?code=a&state=b&replay=c')
    ).toBe('https://x.example/app/?replay=c');
  });
});
