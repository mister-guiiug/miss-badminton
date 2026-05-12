import { describe, it, expect } from 'vitest';

describe('routes', () => {
  it('should export ROUTE_META with all routes', async () => {
    const { ROUTE_META } = await import('./routes');
    expect(ROUTE_META.home.documentTitle).toBe('Miss Badminton');
    expect(ROUTE_META.match.documentTitle).toContain('Match');
    expect(ROUTE_META.history.documentTitle).toContain('Historique');
    expect(ROUTE_META.settings.documentTitle).toContain('Paramètres');
  });
});
