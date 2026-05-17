Le dossier des assets Rive a été déplacé vers `src/assets/rive/` pour
permettre à Vite de détecter automatiquement leur présence à la
compilation (`import.meta.glob`) et éviter tout 404 réseau quand un
fichier `.riv` attendu n'a pas été déposé.

Voir [src/assets/rive/README.md](../../src/assets/rive/README.md).
