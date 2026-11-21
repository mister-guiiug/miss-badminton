import { describe, expect, it } from 'vitest';
import {
  filterPlayers,
  nextEmptySlot,
  playersByRecentUse,
  prefillFromHistory,
  slotsFor,
  targetSlot,
  teammateSlot,
  usualPartners,
  withSlot,
  type DraftTeams,
} from './player-picker';
import { indexById, type Player } from './players';
import type { SavedMatch } from './schemas';

const LEA: Player = { id: 'p-lea', name: 'Léa', createdAt: 3 };
const TOM: Player = { id: 'p-tom', name: 'Tom', createdAt: 2 };
const ZOE: Player = { id: 'p-zoe', name: 'Zoé', createdAt: 1 };

function match(
  id: string,
  team1: SavedMatch['config']['team1'],
  team2: SavedMatch['config']['team2'],
  type: 'singles' | 'doubles' = 'singles'
): SavedMatch {
  return {
    id,
    completedAt: 1_700_000_000_000,
    config: {
      type,
      sets: 2,
      points: 15,
      cap: 21,
      sideChange: 'each-set',
      team1,
      team2,
    },
    setScores: [{ team1: 15, team2: 10 }],
    finalSetWins: { team1: 1, team2: 0 },
    winner: 'team1',
  };
}

const VIDE: DraftTeams = {
  team1: { primary: '', partner: '' },
  team2: { primary: '', partner: '' },
};

describe('les places', () => {
  it('deux en simple, quatre en double', () => {
    expect(slotsFor('singles')).toEqual(['t1p', 't2p']);
    expect(slotsFor('doubles')).toEqual(['t1p', 't1q', 't2p', 't2q']);
  });

  it('la cible : le champ désigné, sinon la première place vide', () => {
    expect(targetSlot('singles', VIDE, null)).toBe('t1p');
    const un = withSlot(VIDE, 't1p', 'Léa');
    expect(targetSlot('singles', un, null)).toBe('t2p');
    const deux = withSlot(un, 't2p', 'Tom');
    expect(targetSlot('singles', deux, null)).toBeNull();
    expect(targetSlot('singles', deux, 't1p')).toBe('t1p');
    // Un partenaire désigné ne compte pas en simple.
    expect(targetSlot('singles', deux, 't1q')).toBeNull();
  });

  it('enchaîne sur la place vide suivante, en revenant au début', () => {
    const teams = withSlot(VIDE, 't2p', 'Tom');
    expect(nextEmptySlot('doubles', teams, 't1p')).toBe('t1q');
    expect(nextEmptySlot('doubles', teams, 't2q')).toBe('t1p');
  });
});

describe('playersByRecentUse', () => {
  it('les joueurs du dernier match d’abord, puis le registre', () => {
    const history = [
      match('m2', { primary: 'Zoé', primaryId: 'p-zoe' }, { primary: 'Tom' }),
      match('m1', { primary: 'Léa', primaryId: 'p-lea' }, { primary: 'Tom' }),
    ];
    expect(
      playersByRecentUse([LEA, TOM, ZOE], history).map(p => p.name)
      // Tom et Zoé jouaient le même match : l'ordre du registre départage.
    ).toEqual(['Tom', 'Zoé', 'Léa']);
  });

  it('sans historique, l’ordre du registre', () => {
    expect(playersByRecentUse([LEA, TOM, ZOE], []).map(p => p.name)).toEqual([
      'Léa',
      'Tom',
      'Zoé',
    ]);
  });
});

describe('filterPlayers', () => {
  it('filtre sur la frappe, accents et casse ignorés', () => {
    expect(filterPlayers([LEA, TOM, ZOE], 'ZO').map(p => p.name)).toEqual([
      'Zoé',
    ]);
  });

  it('une frappe vide ou un nom exact ne filtre rien', () => {
    expect(filterPlayers([LEA, TOM, ZOE], '  ')).toHaveLength(3);
    expect(filterPlayers([LEA, TOM, ZOE], 'lea')).toHaveLength(3);
  });
});

describe('prefillFromHistory', () => {
  it('reprend le dernier match, sous les noms courants', () => {
    const renamed = { ...LEA, name: 'Léa M.' };
    const teams = prefillFromHistory(
      [
        match(
          'm2',
          { primary: 'Léa', primaryId: 'p-lea', partner: 'Zoé' },
          { primary: 'Tom', partner: '' },
          'doubles'
        ),
        match('m1', { primary: 'X' }, { primary: 'Y' }),
      ],
      indexById([renamed, TOM, ZOE])
    );
    expect(teams).toEqual({
      team1: { primary: 'Léa M.', partner: 'Zoé' },
      team2: { primary: 'Tom', partner: '' },
    });
  });

  it('rien à reprendre sans historique ou sans nom saisi', () => {
    expect(prefillFromHistory([], new Map())).toBeNull();
    expect(
      prefillFromHistory(
        [match('m', { primary: '' }, { primary: '' })],
        new Map()
      )
    ).toBeNull();
  });
});

describe('usualPartners', () => {
  const doubles = (
    id: string,
    a: [string, string],
    b: [string, string]
  ): SavedMatch =>
    match(
      id,
      { primary: a[0], partner: a[1] },
      { primary: b[0], partner: b[1] },
      'doubles'
    );

  it('le partenaire le plus fréquent d’abord, dans les deux sens', () => {
    const partnersOf = usualPartners(
      [
        doubles('m3', ['Léa', 'Tom'], ['Zoé', 'Max']),
        doubles('m2', ['Léa', 'Zoé'], ['Tom', 'Max']),
        doubles('m1', ['Tom', 'Léa'], ['Zoé', 'Max']),
      ],
      new Map()
    );
    expect(partnersOf('Léa')).toEqual(['Tom', 'Zoé']);
    expect(partnersOf('léa')).toEqual(['Tom', 'Zoé']);
    expect(partnersOf('Max')).toEqual(['Zoé', 'Tom']);
    expect(partnersOf('Inconnu')).toEqual([]);
  });

  it('ignore les simples, et suit les renommages du registre', () => {
    const partnersOf = usualPartners(
      [
        match('s', { primary: 'Léa' }, { primary: 'Tom' }),
        match(
          'd',
          { primary: 'Léa', partner: 'Zoé', partnerId: 'p-zoe' },
          { primary: 'A', partner: 'B' },
          'doubles'
        ),
      ],
      indexById([{ ...ZOE, name: 'Zoé M.' }])
    );
    expect(partnersOf('Léa')).toEqual(['Zoé M.']);
  });

  it('le coéquipier d’une place', () => {
    expect(teammateSlot('t1p')).toBe('t1q');
    expect(teammateSlot('t2q')).toBe('t2p');
  });
});
