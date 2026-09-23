import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * L'ENCRE DE LA PRIMAIRE, MESURÉE DEPUIS LA FEUILLE.
 *
 * L'app écrivait du BLANC sur `--primary` partout — boutons pleins, segment de
 * période actif, rang n°1, interrupteur allumé — et le pont `--dwc-*` avait
 * repris ce blanc pour les composants du socle. En sombre, `--primary` est un
 * indigo clair (`#818cf8`) : 2,98:1 sous du blanc, 1,99 au survol, sous le 4,5
 * de WCAG AA. Le Chrome de Playwright se déclare en thème CLAIR : aucune suite
 * e2e ne l'avait vu.
 *
 * Deux gardes : la paire elle-même, dans les deux thèmes ; et, dans le code,
 * qu'aucun blanc ne revienne sur un aplat `var(--primary)`.
 */

const racine = import.meta.dirname;
const feuille = readFileSync(join(racine, 'styles.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

/** Les déclarations de tous les blocs dont le sélecteur est exactement `selecteur`. */
function jetons(selecteur: string): Map<string, string> {
  const table = new Map<string, string>();
  for (const [, sel, corps] of feuille.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    // Ce qui suit le dernier `;` : un bloc emporterait sinon un `@import` placé
    // avant lui.
    const cle = sel!.split(';').pop()!.trim().replace(/\s+/g, ' ');
    if (cle !== selecteur) continue;
    for (const [, nom, valeur] of corps!.matchAll(
      /(--[a-z0-9-]+)\s*:\s*([^;]+);/g
    )) {
      table.set(nom!, valeur!.trim());
    }
  }
  return table;
}

const CLAIR = jetons(":root, html[data-theme='light']");
const SOMBRE = new Map([...CLAIR, ...jetons("html[data-theme='dark']")]);

/** Suit les `var(--x)` jusqu'à une couleur hexadécimale. */
function hex(table: Map<string, string>, nom: string): string {
  let valeur = table.get(nom) ?? '';
  for (let i = 0; i < 8; i += 1) {
    const renvoi = /^var\((--[a-z0-9-]+)\)$/.exec(valeur);
    if (!renvoi) break;
    valeur = table.get(renvoi[1]!) ?? '';
  }
  return valeur;
}

function luminance(couleur: string): number {
  const h = couleur.replace('#', '');
  const canal = (i: number) => {
    const c = Number.parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  const [haut, bas] = x > y ? [x, y] : [y, x];
  return (haut + 0.05) / (bas + 0.05);
}

describe('styles.css - la primaire et son encre', () => {
  it.each([
    ['clair', CLAIR],
    ['sombre', SOMBRE],
  ] as const)('%s : tient en aplat ET en texte', (_theme, table) => {
    const primaire = hex(table, '--primary');
    const encre = hex(table, '--primary-ink');
    // Garde de non-vacuité : une chaîne `var()` rompue rendrait une chaîne
    // vide, et le rapport calculé sur `NaN` ne tomberait jamais.
    expect(primaire).toMatch(/^#[0-9a-f]{6}$/i);
    expect(encre).toMatch(/^#[0-9a-f]{6}$/i);

    // L'aplat sous son encre, au repos et au survol.
    expect(contraste(primaire, encre)).toBeGreaterThanOrEqual(4.5);
    expect(
      contraste(hex(table, '--primary-hover'), encre)
    ).toBeGreaterThanOrEqual(4.5);
    // La primaire en texte : titres, pourcentages, liens du socle.
    expect(contraste(primaire, hex(table, '--surface'))).toBeGreaterThanOrEqual(
      4.5
    );
    expect(contraste(primaire, hex(table, '--bg'))).toBeGreaterThanOrEqual(4.5);
  });

  it('le socle lit la même paire que l’app', () => {
    expect(CLAIR.get('--dwc-primary')).toBe('var(--primary)');
    expect(CLAIR.get('--dwc-primary-contrast')).toBe('var(--primary-ink)');
  });
});

/**
 * UN BLANC SUR `var(--primary)` NE TIENT QU'EN CLAIR. Le défaut ne se voyait
 * qu'en sombre, donc ni à la relecture ni dans un e2e : on le cherche dans le
 * texte. Une occurrence est un blanc (`text-white`, `'#fff'`, `'white'`,
 * `#fff;`) à quatre lignes au plus d'un fond `var(--primary)`. Les blancs sur
 * `rgba(0,0,0,…)` - bandeaux du tableau de score - ne sont pas visés.
 */
describe('le code - aucun blanc sur la primaire', () => {
  const BLANC =
    /\btext-white\b|'#fff(?:fff)?'|'white'|color:\s*#fff(?:fff)?\s*;/i;
  // Un fond primaire : en CSS, dans un `style` JSX, et dans un `style` dont la
  // condition passe à la ligne (`background:` puis `cond ? 'var(--primary)'`).
  const FOND = [
    /background:\s*var\(--primary\)\s*;/,
    /background:\s*(?:[^'\n]*\?\s*)?'var\(--primary\)'/,
    /background:\s*\n[^\n]*\?\s*'var\(--primary\)'/,
  ];

  function sources(dossier: string): string[] {
    return readdirSync(dossier, { withFileTypes: true }).flatMap(e => {
      const chemin = join(dossier, e.name);
      if (e.isDirectory()) return sources(chemin);
      return /\.(tsx|css)$/.test(e.name) && !e.name.includes('.test.')
        ? [chemin]
        : [];
    });
  }

  it('aucune occurrence', () => {
    const fichiers = sources(racine);
    // Non-vacuité : les deux fichiers qui en portaient le plus sont lus.
    expect(fichiers.some(f => f.endsWith('SettingsView.tsx'))).toBe(true);
    expect(fichiers.some(f => f.endsWith('styles.css'))).toBe(true);

    const fautes: string[] = [];
    for (const fichier of fichiers) {
      const lignes = readFileSync(fichier, 'utf8').split('\n');
      lignes.forEach((ligne, i) => {
        if (!BLANC.test(ligne)) return;
        const voisins = lignes.slice(Math.max(0, i - 4), i + 5).join('\n');
        if (FOND.some(motif => motif.test(voisins))) {
          fautes.push(`${fichier.slice(racine.length)}:${i + 1}`);
        }
      });
    }
    expect(fautes).toEqual([]);
  });
});
