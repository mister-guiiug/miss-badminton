import { describe, expect, it } from 'vitest';
import { __test__ } from './result-card';

describe('result-card helpers', () => {
  it('formatDuration sous une heure', () => {
    expect(__test__.formatDuration(125_000)).toBe('2:05');
  });

  it('formatDuration avec heures', () => {
    expect(__test__.formatDuration(3_661_000)).toBe('1:01:01');
  });

  it('formatDate produit une chaîne non vide', () => {
    expect(
      __test__.formatDate(Date.UTC(2026, 9, 3), 'fr').length
    ).toBeGreaterThan(0);
  });
});
