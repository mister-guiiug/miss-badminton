import { describe, expect, it } from 'vitest';
import { LOCALES, messages } from './messages';

/**
 * Le type `Messages` garantit déjà la parité au compile-time, mais une
 * vérification runtime attrape les cas où :
 *  - une clé optionnelle a été ajoutée et oubliée dans une locale
 *  - une valeur a été rendue vide par accident
 *  - du copier-coller a laissé une clé inattendue dans une seule locale
 */

function collectKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

function collectValues(obj: unknown, prefix = ''): [string, string][] {
  if (obj === null || typeof obj !== 'object') return [];
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...collectValues(v, path));
    } else if (typeof v === 'string') {
      out.push([path, v]);
    }
  }
  return out;
}

describe('i18n messages', () => {
  const referenceKeys = collectKeys(messages.fr);

  it.each(LOCALES.filter(l => l !== 'fr'))(
    'locale "%s" expose exactement les mêmes clés que fr',
    locale => {
      const keys = collectKeys(messages[locale]);
      expect(keys).toEqual(referenceKeys);
    }
  );

  it.each(LOCALES)('locale "%s" : aucune string vide', locale => {
    const empties = collectValues(messages[locale])
      .filter(([, v]) => v.trim().length === 0)
      .map(([k]) => k);
    expect(empties).toEqual([]);
  });
});
