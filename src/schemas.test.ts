import { describe, expect, it } from 'vitest';
import { MatchConfigSchema, SavedMatchSchema } from './schemas';

/**
 * LE FORMAT VOYAGE AVEC LE MATCH. Historique, modèles, lien « rejouer »,
 * export : tout repasse par ces schémas, et zod retire en silence ce qu'ils ne
 * déclarent pas. Un match en 15 points y perdrait son changement de côté à 8.
 */

const troisFois15 = {
  type: 'singles',
  sets: 2,
  points: 15,
  winBy: 2,
  cap: 21,
  sideChange: 'each-set',
  sideChangeAt: 8,
  team1: { primary: 'Léa', id: 'A' },
  team2: { primary: 'Tom', id: 'B' },
};

describe('le format d’un match à la lecture', () => {
  it('garde l’écart et le point du changement de côté', () => {
    const lu = MatchConfigSchema.parse(troisFois15);
    expect(lu.winBy).toBe(2);
    expect(lu.sideChangeAt).toBe(8);

    const match = SavedMatchSchema.parse({
      id: 'm-15',
      completedAt: 1_790_000_000_000,
      config: troisFois15,
      setScores: [
        { team1: 15, team2: 12 },
        { team1: 21, team2: 20 },
      ],
      finalSetWins: { team1: 2, team2: 0 },
      winner: 'team1',
    });
    expect(match.config.sideChangeAt).toBe(8);
  });

  it('lit un match enregistré avant ces réglages', () => {
    const avant = {
      type: 'singles',
      sets: 2,
      points: 21,
      cap: 30,
      sideChange: 'mid-match',
      team1: { primary: 'Léa' },
      team2: { primary: 'Tom' },
    };
    expect(MatchConfigSchema.safeParse(avant).success).toBe(true);
  });

  it('lit une valeur que cette version ne propose pas', () => {
    // Une version future pourrait proposer un changement à 6 ou un écart de
    // 3 : son historique doit rester lisible ici, pas être rejeté en bloc.
    expect(
      MatchConfigSchema.safeParse({ ...troisFois15, winBy: 3, sideChangeAt: 6 })
        .success
    ).toBe(true);
  });
});
