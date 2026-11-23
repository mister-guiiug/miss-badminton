# Miss Badminton

PWA de suivi de scores et statistiques de badminton.

## Guides

- [Compter les points au badminton](https://mister-guiiug.github.io/miss-badminton/compter-les-points-au-badminton.html)
- [Règles du service au badminton](https://mister-guiiug.github.io/miss-badminton/regles-du-service-au-badminton.html)

## 🚀 Démarrage rapide

Prérequis : un jeton GitHub (droit `read:packages`) dans `NODE_AUTH_TOKEN`, car
`npm install` tire `@mister-guiiug/dev-pwa-config` de GitHub Packages.

```bash
npm install
npm run dev
```

## 📦 Scripts disponibles

| Commande                 | Description                                                                     |
| ------------------------ | ------------------------------------------------------------------------------- |
| `npm run dev`            | Serveur de développement                                                        |
| `npm run build`          | Build de production                                                             |
| `npm run preview`        | Prévisualiser le build                                                          |
| `npm run lint`           | Vérifier le code                                                                |
| `npm run format`         | Formater le code                                                                |
| `npm run type-check`     | Vérification TypeScript                                                         |
| `npm run test`           | Tests unitaires                                                                 |
| `npm run test:e2e`       | Tests E2E Playwright                                                            |
| `npm run icons`          | Générer `icon-192.png` et `icon-512.png` depuis `public/logo.svg`               |
| `npm run icons:maskable` | Générer l'icône maskable et l'icône iOS depuis `public/icons/icon-maskable.svg` |

## 🏗️ Stack technique

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS v4**
- **vite-plugin-pwa** (Workbox)
- **React Router v7**
- **Zustand** (état global)
- **Vitest** (tests unitaires)
- **Playwright** (tests E2E)
- **ESLint** + **Prettier** + **Husky** + **lint-staged**
- **@mister-guiiug/dev-pwa-config** (configurations partagées)
- **Sentry** (rapports d'erreur) et **PostHog** (mesure d'audience, après accord)

## 🏸 Tournois eBad

La page **Tournois eBad** (`/tournois`) relie l'app au suivi des tournois de
la FFBaD dans eBad :

- **Saisir** les matchs suivis dans eBad (tournoi, tableau, terrain, horaire,
  joueurs, et au besoin le score qui y a été saisi). eBad n'expose pas d'API
  publique : la saisie est manuelle et reste sur l'appareil.
- **Préparer** un match : l'assistant s'ouvre prérempli (simple ou double
  selon la discipline, joueurs, format 15 ou 21 points). En fin de partie, le
  match scoré se lie tout seul à son match eBad.
- **Associer** un match scoré à un match eBad, depuis cette page ou depuis
  l'historique, avec des suggestions (noms, discipline, jour). La carte donne
  alors le score à saisir dans eBad, remis dans l'ordre des équipes eBad, et
  signale un écart avec le score qui y a été saisi.
- **Importer** les matchs d'un tournoi depuis la FFBaD, via un connecteur
  (proxy serveur qui garde les identifiants). Un nouvel import met à jour les
  horaires et les résultats officiels. L'accès aux WebServices FFBaD demande
  une convention avec la fédération : voir
  [`docs/ebad-connecteur.md`](docs/ebad-connecteur.md). Sans connecteur
  configuré (`VITE_EBAD_PROXY_URL`), l'import ne s'affiche pas.

## 🔒 Données

Pas de compte ni de serveur : les matchs restent sur l'appareil (stockage du
navigateur). Le site publié branche deux services tiers hébergés dans l'Union
européenne : **Sentry** démarre à l'ouverture, sans demander d'accord, et ne
reçoit un rapport technique que lorsqu'une erreur survient ;
**PostHog** ne mesure la fréquentation qu'après accord dans le bandeau de
consentement.

Si le connecteur eBad est configuré, la recherche d'un tournoi interroge le
proxy FFBaD de l'exploitant (nom du tournoi ou de la ville, date). Les matchs
importés restent sur l'appareil.

## 🌐 Déploiement

L'application est déployée automatiquement sur GitHub Pages via GitHub Actions :
`https://mister-guiiug.github.io/miss-badminton/`

## 🎨 Icônes

Les icônes viennent de deux sources SVG : `public/logo.svg` pour les icônes
standard, `public/icons/icon-maskable.svg` (dessinée à fond perdu) pour l'icône
maskable Android et l'icône d'accueil iOS. Après modification, exécuter :

```bash
npm run icons
npm run icons:maskable
```

Les PNG sont écrits dans `public/icons/`.
