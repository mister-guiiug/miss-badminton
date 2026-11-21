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

## Essayer sans convention

```bash
VITE_EBAD_PROXY_URL=mock npm run dev
```

Le bouton « Importer depuis la FFBaD » apparaît sur `/tournois`. Il interroge
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
