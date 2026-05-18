/**
 * Distance perceptuelle ΔE76 (CIE Lab) entre deux couleurs hex.
 * Suffisante pour détecter "couleurs trop proches" ; pas pour de la
 * mesure scientifique. Seuil pratique : < 25 = très proches.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}
interface Lab {
  L: number;
  a: number;
  b: number;
}

function parseHex(hex: string): Rgb | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const value = parseInt(m[1], 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToXyz({ r, g, b }: Rgb): { x: number; y: number; z: number } {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return {
    x: lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375,
    y: lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175,
    z: lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041,
  };
}

function pivot(n: number): number {
  return n > 0.008856 ? Math.cbrt(n) : 7.787 * n + 16 / 116;
}

function xyzToLab({ x, y, z }: { x: number; y: number; z: number }): Lab {
  // D65 reference white
  const fx = pivot(x / 0.95047);
  const fy = pivot(y / 1.0);
  const fz = pivot(z / 1.08883);
  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function hexToLab(hex: string): Lab | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return xyzToLab(rgbToXyz(rgb));
}

export function colorDistance(hexA: string, hexB: string): number {
  const a = hexToLab(hexA);
  const b = hexToLab(hexB);
  if (!a || !b) return Infinity;
  const dL = a.L - b.L;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/** Seuil "couleurs trop proches" (< ce ΔE → afficher l'avertissement). */
export const COLOR_CLOSE_THRESHOLD = 25;
