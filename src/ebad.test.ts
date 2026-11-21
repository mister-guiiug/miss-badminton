import { describe, expect, it } from 'vitest';
import {
  compareReported,
  configFromEbad,
  describeEbad,
  formatSets,
  groupByTournament,
  isDoublesDiscipline,
  linkScore,
  localDateKey,
  nameSimilarity,
  parseSets,
  scoreForEbad,
  sortEbadMatches,
  suggestEbadMatches,
  suggestSavedMatches,
  teamSimilarity,
  withoutEbad,
  type EbadMatch,
} from './ebad';
import { FORMAT_15, FORMAT_21 } from './scoring';
import type { SavedMatch } from './schemas';

const DAY = Date.parse('2026-11-21T14:30:00');

function ebad(overrides: Partial<EbadMatch> = {}): EbadMatch {
  return {
    id: 'e1',
    createdAt: 1,
    tournament: 'Tournoi de Lille',
    date: localDateKey(DAY),
    discipline: 'SH',
    team1: { primary: 'DUPONT Jean' },
    team2: { primary: 'MARTIN Paul' },
    ...overrides,
  };
}

function saved(overrides: Partial<SavedMatch> = {}): SavedMatch {
  return {
    id: 's1',
    completedAt: DAY,
    config: {
      type: 'singles',
      sets: 2,
      points: 15,
      cap: 21,
      sideChange: 'each-set',
      team1: { primary: 'Jean Dupont', id: 'A' },
      team2: { primary: 'Paul Martin', id: 'B' },
    },
    setScores: [
      { team1: 15, team2: 12 },
      { team1: 13, team2: 15 },
      { team1: 15, team2: 9 },
    ],
    finalSetWins: { team1: 2, team2: 1 },
    winner: 'team1',
    ...overrides,
  };
}

describe('disciplines', () => {
  it('SH et SD se jouent en simple, le reste en double', () => {
    expect(isDoublesDiscipline('SH')).toBe(false);
    expect(isDoublesDiscipline('SD')).toBe(false);
    expect(isDoublesDiscipline('DH')).toBe(true);
    expect(isDoublesDiscipline('DD')).toBe(true);
    expect(isDoublesDiscipline('DX')).toBe(true);
  });
});

describe('configFromEbad — préparer un match', () => {
  it('un simple en 15 points par défaut, avec son indice eBad', () => {
    const config = configFromEbad(ebad());
    expect(config.type).toBe('singles');
    expect(config.sets).toBe(2);
    expect(config.points).toBe(FORMAT_15.points);
    expect(config.cap).toBe(FORMAT_15.cap);
    expect(config.sideChangeAt).toBe(FORMAT_15.sideChangeAt);
    expect(config.team1).toEqual({
      primary: 'DUPONT Jean',
      partner: undefined,
      id: 'A',
    });
    expect(config.team2.id).toBe('B');
    expect(config.ebadMatchId).toBe('e1');
  });

  it('un double garde les partenaires, et le format annoncé', () => {
    const config = configFromEbad(
      ebad({
        discipline: 'DX',
        points: 21,
        team1: { primary: 'A', partner: ' B ' },
        team2: { primary: 'C', partner: 'D' },
      })
    );
    expect(config.type).toBe('doubles');
    expect(config.points).toBe(FORMAT_21.points);
    expect(config.team1.partner).toBe('B');
    expect(config.team2.partner).toBe('D');
  });

  it('withoutEbad retire l’indice sans toucher au reste', () => {
    const config = configFromEbad(ebad());
    const plain = withoutEbad(config);
    expect('ebadMatchId' in plain).toBe(false);
    expect(plain.team1).toEqual(config.team1);
  });
});

describe('ressemblance des noms', () => {
  it('ignore l’ordre, la casse et les accents', () => {
    expect(nameSimilarity('DUPONT Jean', 'jean dupont')).toBe(1);
    expect(nameSimilarity('René Lefèvre', 'LEFEVRE rene')).toBe(1);
  });

  it('un nom partiel suffit', () => {
    expect(nameSimilarity('Dupont', 'DUPONT Jean')).toBe(1);
  });

  it('des noms sans rapport valent 0', () => {
    expect(nameSimilarity('Dupont', 'Martin')).toBe(0);
    expect(nameSimilarity('', 'Martin')).toBe(0);
  });

  it('en double, l’ordre des partenaires ne compte pas', () => {
    expect(teamSimilarity(['A Aa', 'B Bb'], ['B Bb', 'A Aa'])).toBe(1);
    expect(teamSimilarity(['A Aa', 'B Bb'], ['A Aa', 'Zz'])).toBe(0.5);
  });
});

describe('linkScore — rapprocher', () => {
  it('reconnaît le même match, dans le même sens', () => {
    const a = linkScore(ebad(), saved());
    expect(a.orientation).toBe('same');
    expect(a.names).toBe(1);
    expect(a.likely).toBe(true);
  });

  it('reconnaît des équipes inversées', () => {
    const a = linkScore(
      ebad({
        team1: { primary: 'MARTIN Paul' },
        team2: { primary: 'DUPONT Jean' },
      }),
      saved()
    );
    expect(a.orientation).toBe('swapped');
    expect(a.likely).toBe(true);
  });

  it('un simple ne se rapproche pas d’un double', () => {
    const a = linkScore(ebad({ discipline: 'DH' }), saved());
    expect(a.likely).toBe(false);
    expect(a.score).toBeLessThan(linkScore(ebad(), saved()).score);
  });

  it('le jour départage deux matchs aux mêmes noms', () => {
    const sameDay = linkScore(ebad(), saved()).score;
    const otherDay = linkScore(ebad({ date: '2026-10-01' }), saved()).score;
    const noDate = linkScore(ebad({ date: undefined }), saved()).score;
    expect(sameDay).toBeGreaterThan(noDate);
    expect(noDate).toBeGreaterThan(otherDay);
  });

  it('consulte le résolveur de noms quand il est fourni', () => {
    const a = linkScore(ebad(), saved(), team =>
      team.id === 'A' ? ['Jean Dupont'] : ['Paul Martin']
    );
    expect(a.names).toBe(1);
  });
});

describe('suggestions', () => {
  it('trie les matchs de l’historique, le plus probable en tête', () => {
    const other = saved({
      id: 's2',
      config: {
        ...saved().config,
        team1: { primary: 'Luc', id: 'A' },
        team2: { primary: 'Marc', id: 'B' },
      },
    });
    const list = suggestSavedMatches(ebad(), [other, saved()], [ebad()]);
    expect(list.map(x => x.match.id)).toEqual(['s1', 's2']);
  });

  it('écarte un match de l’historique déjà lié à un autre match eBad', () => {
    const taken = ebad({ id: 'e2', linkedMatchId: 's1' });
    const list = suggestSavedMatches(ebad(), [saved()], [ebad(), taken]);
    expect(list).toEqual([]);
  });

  it('écarte un match eBad déjà lié à un autre match scoré', () => {
    const list = suggestEbadMatches(saved(), [
      ebad({ id: 'e1', linkedMatchId: 'autre' }),
      ebad({ id: 'e2' }),
      ebad({ id: 'e3', linkedMatchId: 's1' }),
    ]);
    expect(list.map(x => x.ebad.id).sort()).toEqual(['e2', 'e3']);
  });
});

describe('score à reporter dans eBad', () => {
  it('dans le même sens, les sets tels quels', () => {
    expect(formatSets(scoreForEbad(ebad(), saved()))).toBe('15-12 13-15 15-9');
  });

  it('équipes inversées : remis dans l’ordre eBad', () => {
    const e = ebad({
      team1: { primary: 'MARTIN Paul' },
      team2: { primary: 'DUPONT Jean' },
    });
    expect(formatSets(scoreForEbad(e, saved()))).toBe('12-15 15-13 9-15');
  });

  it('compare le score saisi dans eBad', () => {
    expect(compareReported(ebad(), saved())).toBe('none');
    expect(compareReported(ebad(), undefined)).toBe('none');
    expect(
      compareReported(
        ebad({ reportedScore: parseSets('15-12 13-15 15-9') ?? [] }),
        saved()
      )
    ).toBe('match');
    expect(
      compareReported(
        ebad({ reportedScore: parseSets('15-12 15-13') ?? [] }),
        saved()
      )
    ).toBe('mismatch');
    expect(
      compareReported(
        ebad({ reportedScore: parseSets('15-12 13-15 15-8') ?? [] }),
        saved()
      )
    ).toBe('mismatch');
  });
});

describe('parseSets', () => {
  it('lit les séparateurs usuels', () => {
    expect(parseSets('21-15 18-21, 21:19')).toEqual([
      { team1: 21, team2: 15 },
      { team1: 18, team2: 21 },
      { team1: 21, team2: 19 },
    ]);
    expect(parseSets('15–12 / 15–9')).toHaveLength(2);
  });

  it('une chaîne vide, c’est « pas encore saisi »', () => {
    expect(parseSets('   ')).toEqual([]);
  });

  it('refuse ce qui ne se lit pas', () => {
    expect(parseSets('21 15')).toBeNull();
    expect(parseSets('15-15')).toBeNull();
    expect(parseSets('abc')).toBeNull();
    expect(parseSets('1-0 '.repeat(10))).toBeNull();
  });
});

describe('ordre et regroupement', () => {
  it('par jour, puis par heure ; sans date en dernier', () => {
    const list = sortEbadMatches([
      ebad({ id: 'c', date: undefined }),
      ebad({ id: 'b', date: '2026-11-21', time: '14:00' }),
      ebad({ id: 'a', date: '2026-11-21', time: '09:30' }),
      ebad({ id: 'z', date: '2026-11-20' }),
    ]);
    expect(list.map(m => m.id)).toEqual(['z', 'a', 'b', 'c']);
  });

  it('regroupe par tournoi', () => {
    const groups = groupByTournament([
      ebad({ id: 'a', tournament: 'Lille' }),
      ebad({ id: 'b', tournament: 'Lens ' }),
      ebad({ id: 'c', tournament: 'Lille' }),
    ]);
    expect(groups.map(g => [g.tournament, g.matches.length])).toEqual([
      ['Lille', 2],
      ['Lens', 1],
    ]);
  });

  it('décrit un match en une ligne', () => {
    expect(describeEbad(ebad({ round: 'P10 — Poule A' }))).toBe(
      'Tournoi de Lille · SH · P10 — Poule A'
    );
  });
});
