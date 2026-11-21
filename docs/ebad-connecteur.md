# Connecteur eBad / FFBaD

Le connecteur permet d'**importer les matchs d'un tournoi FFBaD** dans la page
« Tournois eBad », au lieu de les recopier à la main. Un second import met à
jour les horaires, terrains et résultats officiels, sans perdre l'association
avec le match scoré.

## Pourquoi un proxy

eBad lit les tournois dans les **WebServices de la FFBaD** (`api.ffbad.org`).
Leur accès est réservé : il passe par une **convention avec la fédération**,
qui délivre des identifiants. Miss Badminton est une PWA statique (GitHub
Pages), et tout ce que contient son bundle est lisible par n'importe qui : les
identifiants ne peuvent donc pas y vivre.

```
App (navigateur) ──GET──▶ Proxy (serveur, garde les identifiants) ──▶ WebServices FFBaD
        ▲                         │
        └──── contrat JSON ◀──────┘   (src/ebad-contract.ts)
```

- L'app ne connaît que **notre contrat** (`src/ebad-contract.ts`), jamais le
  format FFBaD : si l'API amont change, seul le proxy bouge.
- Le proxy n'expose que deux routes en lecture, limite le CORS à l'origine de
  l'app, borne les paramètres, revalide ses réponses et ne recopie jamais une
  erreur amont.

## État actuel

| Élément                                                  | État                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| Contrat app ↔ proxy (`src/ebad-contract.ts`)             | ✅ prêt                                                       |
| Client et écran d'import (`src/ebad-connector.ts`)       | ✅ prêt, testé                                                |
| Gestionnaire du proxy (`src/ebad-proxy/handler.ts`)      | ✅ prêt, testé (CORS, validation, erreurs)                    |
| Jeu de démonstration (`src/ebad-proxy/mock-upstream.ts`) | ✅ prêt                                                       |
| Adaptateur FFBaD (`src/ebad-proxy/ffbad-upstream.ts`)    | ⏳ **à brancher** : convention + documentation FFBaD requises |

Tant que l'adaptateur FFBaD n'est pas écrit, le proxy répond **501** et l'app
affiche « Le connecteur FFBaD n'est pas encore branché ». Les noms de fonctions
et le format de l'API FFBaD ne sont volontairement **pas devinés** : appeler des
routes non documentées, ou internes à eBad, sans autorisation n'est pas
acceptable.

## « Se connecter avec MyFFBaD » (OAuth)

Plutôt que des identifiants de convention partagés par le serveur, chaque
utilisateur peut se connecter **avec son propre compte MyFFBaD**, selon le flux
standard **OAuth 2.0 Authorization Code + PKCE** :

```
1. App ──redirection──▶ Page de connexion FFBaD   (l'utilisateur s'y identifie)
2. FFBaD ──redirection──▶ App (racine) ?code=…&state=…   → renvoi vers /tournois
3. App ──POST /oauth/token (code + vérificateur PKCE)──▶ Proxy ──▶ Point de jeton FFBaD
4. App ──GET /tournaments (Authorization: Bearer <jeton>)──▶ Proxy ──▶ API FFBaD
```

- **Aucun mot de passe ne passe par Miss Badminton** : l'utilisateur s'identifie
  sur le site de la FFBaD. Demander ses identifiants dans l'app pour les rejouer
  sur l'API interne d'eBad serait une collecte de mots de passe par un tiers :
  ce n'est pas fait, et ne doit pas l'être.
- `state` aléatoire vérifié au retour (CSRF), vérificateur PKCE gardé dans
  l'onglet (un code intercepté est inutilisable), demande valable 10 minutes,
  consommée au premier retour.
- Le code est échangé par le **proxy** (`src/ebad-proxy/oauth.ts`), qui garde
  le secret client s'il y en a un ; il refuse une adresse de retour hors des
  origines autorisées.
- Le jeton vit dans `sessionStorage` (il disparaît avec l'onglet) et n'est
  envoyé qu'au proxy ; un 401 l'efface et le bouton de connexion revient.
- L'**adresse de retour est la racine de l'app** (GitHub Pages n'a pas de page
  de secours pour `/tournois`) : la racine repère le retour attendu et renvoie
  vers `/tournois`, qui termine la connexion.

Ce qu'il faut obtenir de la FFBaD : l'enregistrement de Miss Badminton comme
**client OAuth** (identifiant client, adresse d'autorisation, point de jeton,
portées) avec l'adresse de retour `https://mister-guiiug.github.io/miss-badminton/`.

| Variable                        | Où                      | Rôle                                  |
| ------------------------------- | ----------------------- | ------------------------------------- |
| `VITE_EBAD_OAUTH_AUTHORIZE_URL` | app (variable publique) | adresse d'autorisation FFBaD          |
| `VITE_EBAD_OAUTH_CLIENT_ID`     | app (variable publique) | identifiant client                    |
| `VITE_EBAD_OAUTH_SCOPE`         | app (variable publique) | portées demandées (facultatif)        |
| `FFBAD_OAUTH_TOKEN_URL`         | proxy (secret serveur)  | point de jeton FFBaD                  |
| `FFBAD_OAUTH_CLIENT_ID`         | proxy (secret serveur)  | identifiant client                    |
| `FFBAD_OAUTH_CLIENT_SECRET`     | proxy (secret serveur)  | seulement pour un client confidentiel |

Côté proxy, passer l'échangeur au gestionnaire :

```ts
import { createTokenEndpointExchanger } from './src/ebad-proxy/oauth';
// …
handleEbadProxy(request, {
  upstream: createFfbadUpstream(env),
  oauth: createTokenEndpointExchanger(env),
  allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean),
});
```

L'adaptateur FFBaD reçoit alors le jeton de l'utilisateur dans
`context.accessToken` et le présente à l'API FFBaD.

## Essayer sans convention

```bash
VITE_EBAD_PROXY_URL=mock VITE_EBAD_OAUTH_AUTHORIZE_URL=mock npm run dev
```

`VITE_EBAD_OAUTH_AUTHORIZE_URL=mock` simule aussi la connexion MyFFBaD (aller,
retour, échange du code, jeton) sans quitter l'app.

Le bouton « Importer depuis la FFBaD » apparaît sur `/tournois` (en
développement seulement : le build de production n'embarque pas la
démonstration). Il interroge
des tournois et des joueurs **fictifs**, à travers le vrai gestionnaire du
proxy, en mémoire, sans aucun appel réseau.

## Obtenir l'accès FFBaD

1. Écrire à la FFBaD (service informatique / vie fédérale) pour demander un
   accès conventionné aux WebServices, en précisant :
   - l'usage : afficher dans une application de scoring les matchs d'un
     tournoi (date, heure, terrain, tableau, joueurs, résultat) pour préparer
     un match et vérifier le score reporté ;
   - les données demandées : **noms des joueurs uniquement** (pas de licence,
     date de naissance, club ni coordonnées) ;
   - la conservation : sur l'appareil de l'utilisateur, aucune base centrale ;
     le proxy ne stocke rien (cache HTTP de quelques minutes seulement).
2. Récupérer les identifiants et la **documentation** des fonctions.
3. Implémenter `searchTournaments` et `tournamentMatches` dans
   `src/ebad-proxy/ffbad-upstream.ts`, en traduisant vers le contrat.

## Déployer le proxy

Le gestionnaire est un `Request → Response` standard : il tourne sur une
fonction Vercel (runtime Edge), un Cloudflare Worker, Deno ou Node 18+.

**Variables d'environnement du SERVEUR** (secrets, jamais préfixées `VITE_`) :

| Variable          | Rôle                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `FFBAD_API_URL`   | URL des WebServices FFBaD fournie avec la convention                                           |
| `FFBAD_LOGIN`     | identifiant de la convention                                                                   |
| `FFBAD_PASSWORD`  | mot de passe de la convention                                                                  |
| `ALLOWED_ORIGINS` | origines autorisées, séparées par des virgules — par exemple `https://mister-guiiug.github.io` |

Exemple de point d'entrée, Cloudflare Worker :

```ts
import { handleEbadProxy } from './src/ebad-proxy/handler';
import { createFfbadUpstream } from './src/ebad-proxy/ffbad-upstream';

export default {
  fetch(request: Request, env: Record<string, string>) {
    return handleEbadProxy(request, {
      upstream: createFfbadUpstream(env),
      allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean),
    });
  },
};
```

Exemple de point d'entrée, fonction Vercel (runtime Edge), dans
`api/ebad/[...path].ts` d'un projet séparé :

```ts
import { handleEbadProxy } from '../../src/ebad-proxy/handler';
import { createFfbadUpstream } from '../../src/ebad-proxy/ffbad-upstream';

export const config = { runtime: 'edge' };

export default function handler(request: Request) {
  return handleEbadProxy(request, {
    upstream: createFfbadUpstream(process.env),
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .filter(Boolean),
  });
}
```

## Brancher l'app

Au build, poser la variable **publique** `VITE_EBAD_PROXY_URL` (dans les
variables du dépôt GitHub, pas dans les secrets) avec l'adresse du proxy, par
exemple `https://ebad-proxy.exemple.workers.dev`. La politique de sécurité
(`connect-src`) s'ouvre alors à cette seule origine (`vite.config.ts`).
Absente, l'import ne s'affiche pas et rien ne change.
