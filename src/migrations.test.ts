import { describe, expect, it } from 'vitest';
import { migrate, migrations } from './migrations';

describe('migrate', () => {
  it('retourne le payload tel quel si aucune migration enregistrée', () => {
    const raw = { __version: 1, foo: 'bar' };
    expect(migrate('matchConfig', raw)).toEqual({ __version: 1, foo: 'bar' });
  });

  it("traite l'absence de __version comme version 1", () => {
    const raw = { foo: 'bar' };
    // current vaut 1 pour matchConfig : aucune migration n'est appliquée.
    const out = migrate('matchConfig', raw);
    expect(out).toEqual({ __version: 1, foo: 'bar' });
  });

  it('applique séquentiellement les migrations enregistrées', () => {
    // On enregistre temporairement une migration synthétique pour tester
    // la mécanique de chaînage.
    const before = { ...migrations.matchConfig };
    try {
      migrations.matchConfig = {
        current: 3,
        1: (old: unknown) => ({
          ...(old as Record<string, unknown>),
          added_in_v2: true,
        }),
        2: (old: unknown) => ({
          ...(old as Record<string, unknown>),
          added_in_v3: 42,
        }),
      };
      const raw = { __version: 1, name: 'test' };
      const out = migrate('matchConfig', raw) as Record<string, unknown>;
      expect(out.added_in_v2).toBe(true);
      expect(out.added_in_v3).toBe(42);
      expect(out.__version).toBe(3);
    } finally {
      migrations.matchConfig = before;
    }
  });

  it('ne touche pas les non-objets (string, number, null, undefined)', () => {
    expect(migrate('matchConfig', null)).toBeNull();
    expect(migrate('matchConfig', 'plain')).toBe('plain');
    expect(migrate('matchConfig', 42)).toBe(42);
    expect(migrate('matchConfig', undefined)).toBeUndefined();
  });
});
