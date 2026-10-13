# Animations Rive

Déposez ici les fichiers `.riv` consommés par l'application. Vite les détecte
automatiquement à la compilation via `import.meta.glob` ; si un fichier
attendu est absent, `MatchView` affiche le volant dessiné (`ShuttleFallback`)
et **aucune requête réseau n'est effectuée** (pas de 404). Un fichier présent
mais illisible rend le même repli : `RiveAnimation` du socle (≥ 6.27.0) écoute
l'erreur de chargement du moteur.

| Fichier       | Utilisation                                           |
| ------------- | ----------------------------------------------------- |
| `shuttle.riv` | Volant animé au centre du scoreboard (page d'accueil) |

## Comment créer un fichier

1. Ouvrez https://rive.app et créez un nouveau projet.
2. Exportez l'artboard au format `.riv` (menu Export → Runtime).
3. Placez le fichier dans ce dossier en respectant le nom ci-dessus.

Le runtime utilisé est le package npm officiel `@rive-app/react-canvas`
maintenu par https://github.com/rive-app.

**Un fichier déposé tel quel ne s'animera pas.** Ce moteur va chercher son
WebAssembly sur unpkg, que la CSP de l'application refuse (`connect-src`, et
pas de `'wasm-unsafe-eval'` en `script-src`) : le volant dessiné reste affiché.
Vérifié le 14/10/2026 avec un `.riv` provisoire. Avant de déposer le premier
fichier, servir le WASM depuis le site et ouvrir `'wasm-unsafe-eval'`, comme
mister-miss-koh (`src/animations/riveLite.ts`, `vite.config.ts`).
