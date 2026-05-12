# Animations Rive

Déposez ici les fichiers `.riv` consommés par l'application.

| Fichier       | Utilisation                                           |
| ------------- | ----------------------------------------------------- |
| `shuttle.riv` | Volant animé au centre du scoreboard (page d'accueil) |

## Comment créer un fichier

1. Ouvrez https://rive.app et créez un nouveau projet.
2. Exportez l'artboard au format `.riv` (menu Export → Runtime).
3. Placez le fichier dans ce dossier en respectant le nom ci-dessus.

Tant qu'un fichier `.riv` est absent, le composant `RiveScene` affiche
un fallback CSS (volant emoji animé) pour garantir le rendu.

Le runtime utilisé est le package npm officiel `@rive-app/react-canvas`
maintenu par https://github.com/rive-app.
