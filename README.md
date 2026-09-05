# Miss Badminton

PWA de suivi de scores et statistiques de badminton.

## 🚀 Démarrage rapide

```bash
npm install
npm run dev
```

## 📦 Scripts disponibles

| Commande             | Description                                       |
| -------------------- | ------------------------------------------------- |
| `npm run dev`        | Serveur de développement                          |
| `npm run build`      | Build de production                               |
| `npm run preview`    | Prévisualiser le build                            |
| `npm run lint`       | Vérifier le code                                  |
| `npm run format`     | Formater le code                                  |
| `npm run type-check` | Vérification TypeScript                           |
| `npm run test`       | Tests unitaires                                   |
| `npm run test:e2e`   | Tests E2E Playwright                              |
| `npm run icons`      | Générer les icônes PWA depuis `docs/Designer.png` |

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

## 🌐 Déploiement

L'application est déployée automatiquement sur GitHub Pages via GitHub Actions :
`https://mister-guiiug.github.io/miss-badminton/`

## 🎨 Icônes

Placer le fichier source dans `docs/Designer.png` puis exécuter :

```bash
npm run icons
```

Cela génère les PNG nécessaires dans `public/icons/`.
