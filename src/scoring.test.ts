import { describe, expect, it } from 'vitest';
import type { MatchConfig } from './react/components/MatchSetupWizard';
import {
  FORMAT_15,
  FORMAT_21,
  isDecidingSet,
  isSetPoint,
  isSetWon,
  midSetSideChangeAt,
  officialFormat,
  setRulesOf,
  type SetRules,
} from './scoring';

/**
 * Joue une suite d'échanges, un caractère par point (`A` ou `B`), et rend le
 * score où le set s'arrête — ou `null` s'il n'est pas fini.
 */
function jouer(
  rules: SetRules,
  echanges: string
): { a: number; b: number } | null {
  let a = 0;
  let b = 0;
  for (const gagnant of echanges) {
    if (gagnant === 'A') a += 1;
    else b += 1;
    if (isSetWon(a, b, rules) || isSetWon(b, a, rules)) return { a, b };
  }
  return null;
}

describe('les sets du format 3 × 15', () => {
  it('15 points et deux d’avance ferment le set', () => {
    expect(isSetWon(15, 13, FORMAT_15)).toBe(true);
    expect(isSetWon(15, 0, FORMAT_15)).toBe(true);
    expect(isSetWon(14, 0, FORMAT_15)).toBe(false);
  });

  it('à 15-14, le set continue : deux points d’écart dès 14-14', () => {
    expect(isSetWon(15, 14, FORMAT_15)).toBe(false);
    expect(isSetWon(16, 14, FORMAT_15)).toBe(true);
    expect(isSetWon(19, 18, FORMAT_15)).toBe(false);
    expect(jouer(FORMAT_15, 'AB'.repeat(14) + 'AB' + 'AA')).toEqual({
      a: 17,
      b: 15,
    });
  });

  it('à 20-20, le 21e point gagne : un set ne dépasse jamais 21', () => {
    expect(isSetWon(21, 20, FORMAT_15)).toBe(true);
    // Le set le plus long possible : on alterne jusqu'au bout.
    expect(jouer(FORMAT_15, 'AB'.repeat(20) + 'B')).toEqual({ a: 20, b: 21 });
  });
});

describe('les sets du format en 21 points', () => {
  it('21 points et deux d’avance, prolongation dès 20-20', () => {
    expect(isSetWon(21, 19, FORMAT_21)).toBe(true);
    expect(isSetWon(21, 20, FORMAT_21)).toBe(false);
    expect(isSetWon(23, 21, FORMAT_21)).toBe(true);
  });

  it('à 29-29, le 30e point gagne', () => {
    expect(jouer(FORMAT_21, 'AB'.repeat(29) + 'A')).toEqual({ a: 30, b: 29 });
  });
});

describe('les autres réglages', () => {
  it('sans plafond, la prolongation dure tant que personne ne mène de deux', () => {
    const sansPlafond = { ...FORMAT_21, cap: null };
    expect(jouer(sansPlafond, 'AB'.repeat(40))).toBeNull();
    expect(jouer(sansPlafond, 'AB'.repeat(40) + 'AA')).toEqual({
      a: 42,
      b: 40,
    });
  });

  it('écart de 1 : le premier aux points l’emporte, sans prolongation', () => {
    const sec = { ...FORMAT_15, winBy: 1 };
    expect(jouer(sec, 'AB'.repeat(14) + 'A')).toEqual({ a: 15, b: 14 });
  });

  it('un match enregistré avant l’écart réglable se joue à deux points', () => {
    const avant: Pick<MatchConfig, 'points' | 'cap'> = {
      points: 21,
      cap: null,
    };
    expect(setRulesOf(avant)).toEqual({ points: 21, winBy: 2, cap: null });
    expect(setRulesOf({ ...avant, winBy: 1 }).winBy).toBe(1);
  });

  it('seuls 15 et 21 points désignent un format officiel', () => {
    expect(officialFormat(15)).toBe(FORMAT_15);
    expect(officialFormat(21)).toBe(FORMAT_21);
    expect(officialFormat(11)).toBeNull();
  });
});

describe('la balle de set', () => {
  it('en 15 points : à 14-13, à 20-19 et à 20-20, pas à 14-14 ni à 19-19', () => {
    expect(isSetPoint(14, 13, FORMAT_15)).toBe(true);
    expect(isSetPoint(14, 14, FORMAT_15)).toBe(false);
    expect(isSetPoint(19, 19, FORMAT_15)).toBe(false);
    expect(isSetPoint(20, 19, FORMAT_15)).toBe(true);
    // Le plafond : à 20-20, le point suivant gagne, quel qu'en soit l'écart.
    expect(isSetPoint(20, 20, FORMAT_15)).toBe(true);
  });

  it('en 21 points : à 20-20, pas encore ; à 29-29, oui', () => {
    expect(isSetPoint(20, 19, FORMAT_21)).toBe(true);
    expect(isSetPoint(20, 20, FORMAT_21)).toBe(false);
    expect(isSetPoint(29, 29, FORMAT_21)).toBe(true);
  });
});

describe('le set décisif', () => {
  it('le troisième à 1-1 en deux sets gagnants, pas avant', () => {
    expect(isDecidingSet({ team1: 0, team2: 0 }, 2)).toBe(false);
    expect(isDecidingSet({ team1: 1, team2: 0 }, 2)).toBe(false);
    expect(isDecidingSet({ team1: 1, team2: 1 }, 2)).toBe(true);
  });

  it("le seul set d'un match en un set", () => {
    expect(isDecidingSet({ team1: 0, team2: 0 }, 1)).toBe(true);
  });

  it('le cinquième à 2-2 en trois sets gagnants', () => {
    expect(isDecidingSet({ team1: 2, team2: 1 }, 3)).toBe(false);
    expect(isDecidingSet({ team1: 2, team2: 2 }, 3)).toBe(true);
  });
});

describe('le changement de côté en cours de set', () => {
  type Regle = Pick<
    MatchConfig,
    'points' | 'sets' | 'sideChange' | 'sideChangeAt'
  >;
  const officielle15: Regle = {
    points: 15,
    sets: 2,
    sideChange: 'each-set',
    sideChangeAt: 8,
  };

  it('règle officielle en 15 points : à 8, au set décisif seulement', () => {
    expect(midSetSideChangeAt(officielle15, { team1: 0, team2: 0 })).toBeNull();
    expect(midSetSideChangeAt(officielle15, { team1: 1, team2: 0 })).toBeNull();
    expect(midSetSideChangeAt(officielle15, { team1: 1, team2: 1 })).toBe(8);
  });

  it('règle officielle en 21 points : à 11 au set décisif', () => {
    const officielle21: Regle = {
      ...officielle15,
      points: 21,
      sideChangeAt: 11,
    };
    expect(midSetSideChangeAt(officielle21, { team1: 1, team2: 1 })).toBe(11);
  });

  it("un match en un set : c'est le set décisif, le changement y tombe", () => {
    const unSet: Regle = { ...officielle15, sets: 1 };
    expect(midSetSideChangeAt(unSet, { team1: 0, team2: 0 })).toBe(8);
  });

  it('« avant le set décisif » avec un point : aussi dans ce set', () => {
    const decisif: Regle = { ...officielle15, sideChange: 'decisive' };
    expect(midSetSideChangeAt(decisif, { team1: 1, team2: 0 })).toBeNull();
    expect(midSetSideChangeAt(decisif, { team1: 1, team2: 1 })).toBe(8);
  });

  it('« en cours de set » : à chaque set, au point choisi', () => {
    const chaqueSet: Regle = { ...officielle15, sideChange: 'mid-match' };
    for (const setWins of [
      { team1: 0, team2: 0 },
      { team1: 1, team2: 0 },
      { team1: 1, team2: 1 },
    ]) {
      expect(midSetSideChangeAt(chaqueSet, setWins)).toBe(8);
    }
  });

  it('un match d’avant ce réglage garde ce qu’il faisait', () => {
    // « Mi-match (à 11) » : 11, à chaque set.
    const miMatch: Regle = { points: 21, sets: 2, sideChange: 'mid-match' };
    expect(midSetSideChangeAt(miMatch, { team1: 0, team2: 0 })).toBe(11);
    // « Chaque set » : entre les sets seulement, rien en cours de set.
    const chaqueSet: Regle = { points: 21, sets: 2, sideChange: 'each-set' };
    expect(midSetSideChangeAt(chaqueSet, { team1: 1, team2: 1 })).toBeNull();
  });

  it('pas de rappel qui ne tomberait qu’en prolongation', () => {
    // 11 dans un set de 11 : seulement à 11-10, en pleine prolongation.
    const onze: Regle = { points: 11, sets: 2, sideChange: 'mid-match' };
    expect(midSetSideChangeAt(onze, { team1: 0, team2: 0 })).toBeNull();
    const cinq: Regle = { ...officielle15, points: 5 };
    expect(midSetSideChangeAt(cinq, { team1: 1, team2: 1 })).toBeNull();
  });
});
