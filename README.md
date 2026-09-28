# Miss Badminton

PWA de suivi de scores et statistiques de badminton.

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

## 🔒 Données

Pas de compte ni de serveur : les matchs restent sur l'appareil (stockage du
navigateur). Le site publié branche deux services tiers hébergés dans l'Union
européenne : **Sentry** démarre à l'ouverture, sans demander d'accord (il signale
la session et reçoit un rapport technique quand une erreur survient), et
**PostHog** ne mesure la fréquentation qu'après accord dans le bandeau de
consentement.

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
