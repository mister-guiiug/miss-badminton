/**
 * Rend les DEUX images à fond perdu depuis `public/icons/icon-maskable.svg` :
 * le maskable Android (512) et l'icône d'accueil iOS (180).
 *
 * POURQUOI UN SVG À PART, ET PAS LE MODE MASKABLE D'UN GÉNÉRATEUR. Fabriquer un
 * maskable en RÉDUISANT la tuile sur un aplat laisse voir le raccord : le bord
 * arrondi du dégradé se détache du fond, et le masque d'Android le révèle au
 * lieu de le cacher. Un maskable se DESSINE à fond perdu. Le commentaire de
 * `icon-maskable.svg` dit ce qui l'écarte de `logo.svg`, et pourquoi.
 *
 * POURQUOI L'ICÔNE APPLE EST ICI. iOS n'a pas de manifeste pour l'icône
 * d'accueil : il ne lit que `<link rel="apple-touch-icon">`. Et il n'accepte pas
 * la transparence — il comble lui-même ce qui en porte, historiquement par du
 * noir. Le fichier livré jusqu'au 14/09/2026 lui en donnait : mesuré,
 * `coin(0,0) = 0,0,0,0`, alpha ZÉRO, quand le bord de la tuile rendait
 * `91,67,231`. Ce n'était pas une mauvaise couleur, c'était un TROU, et iOS le
 * remplissait à sa façon.
 *
 * La source à fond perdu n'a, elle, aucun coin à combler. D'où `--no-apple` sur
 * `npm run icons` : le générateur du socle écrit `apple-touch-icon.png` PAR
 * DÉFAUT, et il l'aurait aplatie sur son `--bg`, un bleu nuit `12,18,34` qui
 * n'appartient pas à ce dépôt.
 *
 * Exécuter : npm run icons:maskable
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

// `density` : sans elle, sharp pixellise le SVG à 72 ppp AVANT de
// redimensionner, et le dégradé en ressort bandé.
const rend = (taille, nom) =>
  sharp(join(racine, 'public', 'icons', 'icon-maskable.svg'), { density: 384 })
    .resize(taille, taille)
    .png()
    .toFile(join(racine, 'public', 'icons', nom));

await rend(512, 'icon-maskable-512.png');
await rend(180, 'apple-touch-icon.png');

console.log(
  'public/icons/icon-maskable-512.png (512×512) et public/icons/apple-touch-icon.png (180×180) écrits, à fond perdu.'
);
