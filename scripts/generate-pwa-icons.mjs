/**
 * Génère les PNG PWA à partir de public/logo.svg
 * Exécuter : npm run icons
 *
 * DEUX FAMILLES D'ICÔNES, ET C'EST TOUT L'INTÉRÊT DE CE FICHIER.
 *
 *   - `icon-192` / `icon-512` / `apple-touch-icon` : l'image TELLE QUELLE,
 *     coins arrondis compris. C'est ce que montrent iOS, les onglets et les
 *     fiches d'installation.
 *
 *   - `icon-maskable-512` : la même marque, RÉDUITE à 62 % et posée sur un
 *     fond plein bord à bord. Android applique son propre masque — cercle,
 *     goutte, carré arrondi — et ne garantit que les 80 % centraux. Une image
 *     à coins arrondis passée en `maskable` y perd ses coins ET voit son
 *     dessin rogné : c'est exactement ce qui arrivait ici, où le manifeste
 *     déclarait `purpose: 'any maskable'` sur une image dont la trajectoire
 *     partait dans les angles.
 *
 * Le fond du maskable est repris du dégradé de la marque, en aplat : un
 * dégradé sur la zone comblée ferait un raccord visible avec le dessin.
 */
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const input = join(root, 'public', 'logo.svg');
const outDir = join(root, 'public', 'icons');

await mkdir(outDir, { recursive: true });
const svg = await readFile(input);

const sizes = [
  { w: 192, h: 192, name: 'icon-192.png' },
  { w: 512, h: 512, name: 'icon-512.png' },
  { w: 180, h: 180, name: 'apple-touch-icon.png' },
];

for (const { w, h, name } of sizes) {
  await sharp(svg, { density: 384 })
    .resize(w, h, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(join(outDir, name));
}

/* ── L'icône maskable ─────────────────────────────────────────────────────
   ON NE RÉDUIT PAS LA TUILE, ON LA REFAIT. Poser l'icône entière, coins
   arrondis compris, sur un fond plat laissait voir le RACCORD : le bord
   arrondi du dégradé se détachait de l'aplat, un liseré parfaitement visible
   sur un écran d'accueil. Le maskable est donc composé à partir de la MARQUE
   SEULE (raquette et volant), posée sur le même dégradé étendu bord à bord —
   aucune arête, aucun raccord, et le masque d'Android peut couper où il veut. */
const source = svg.toString('utf8');
const defs = source.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? '';
// Tout ce qui suit la tuile : le groupe de la raquette, et rien d'autre.
const finDeLaTuile =
  source.indexOf('/>', source.indexOf('<rect width="64"')) + 2;
const marque = source.slice(finDeLaTuile).replace('</svg>', '').trim();

const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${defs}
  <rect width="64" height="64" fill="url(#mb-logo-bg)"/>
  <g transform="translate(32 32) scale(0.78) translate(-32 -32)">${marque}</g>
</svg>`;

await sharp(Buffer.from(maskableSvg), { density: 384 })
  .resize(512, 512)
  .png()
  .toFile(join(outDir, 'icon-maskable-512.png'));

console.log(
  'Icônes écrites dans public/icons/ : 192, 512, apple-touch 180, et maskable 512 (marque seule, sans tuile).'
);
