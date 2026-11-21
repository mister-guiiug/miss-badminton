import { beforeEach, describe, expect, it } from 'vitest';
import { useEbadStore, type EbadMatchInput } from './useEbadStore';
import { useMatchStore } from './useMatchStore';
import { storage } from '../storage';
import type { SavedMatch } from '../schemas';

function input(overrides: Partial<EbadMatchInput> = {}): EbadMatchInput {
  return {
    tournament: ' Tournoi de Lille ',
    discipline: 'SH',
    round: '  ',
    team1: { primary: 'DUPONT Jean', partner: '' },
    team2: { primary: 'MARTIN Paul' },
    ...overrides,
  };
}

function savedMatch(id: string, ebadMatchId?: string): SavedMatch {
  return {
    id,
    completedAt: Date.now(),
    config: {
      type: 'singles',
      sets: 2,
      points: 15,
      cap: 21,
      sideChange: 'each-set',
      team1: { primary: 'Jean Dupont', id: 'A' },
      team2: { primary: 'Paul Martin', id: 'B' },
      ...(ebadMatchId ? { ebadMatchId } : {}),
    },
    setScores: [
      { team1: 15, team2: 10 },
      { team1: 15, team2: 11 },
    ],
    finalSetWins: { team1: 2, team2: 0 },
    winner: 'team1',
  };
}

beforeEach(() => {
  localStorage.clear();
  useEbadStore.setState({ matches: [] });
  useMatchStore.setState({ matchHistory: [], pendingDeletion: null });
});

describe('useEbadStore', () => {
  it('ajoute un match nettoyé et le persiste', () => {
    const id = useEbadStore.getState().addMatch(input());
    expect(id).toBeTruthy();
    const [m] = useEbadStore.getState().matches;
    expect(m?.tournament).toBe('Tournoi de Lille');
    expect(m?.round).toBeUndefined();
    expect(m?.team1.partner).toBeUndefined();
    expect(storage.loadEbadMatches()).toHaveLength(1);
  });

  it('refuse un match invalide (tournoi vide)', () => {
    expect(useEbadStore.getState().addMatch(input({ tournament: ' ' }))).toBe(
      null
    );
    expect(useEbadStore.getState().matches).toHaveLength(0);
  });

  it('une modification garde la liaison', () => {
    const store = useEbadStore.getState();
    const id = store.addMatch(input()) as string;
    store.link(id, 's1');
    useEbadStore.getState().updateMatch(id, input({ court: '4' }));
    const [m] = useEbadStore.getState().matches;
    expect(m?.court).toBe('4');
    expect(m?.linkedMatchId).toBe('s1');
  });

  it('un match scoré n’est lié qu’à un seul match eBad', () => {
    const store = useEbadStore.getState();
    const a = store.addMatch(input()) as string;
    const b = store.addMatch(input()) as string;
    useEbadStore.getState().link(a, 's1');
    useEbadStore.getState().link(b, 's1');
    const byId = new Map(useEbadStore.getState().matches.map(m => [m.id, m]));
    expect(byId.get(a)?.linkedMatchId).toBeUndefined();
    expect(byId.get(b)?.linkedMatchId).toBe('s1');
  });

  it('linkIfFree ne vole pas une liaison existante', () => {
    const id = useEbadStore.getState().addMatch(input()) as string;
    expect(useEbadStore.getState().linkIfFree(id, 's1')).toBe(true);
    expect(useEbadStore.getState().linkIfFree(id, 's2')).toBe(false);
    expect(useEbadStore.getState().matches[0]?.linkedMatchId).toBe('s1');
  });
});

describe('liaison automatique en fin de match', () => {
  it('un match préparé depuis eBad se lie en finissant', () => {
    const id = useEbadStore.getState().addMatch(input()) as string;
    useMatchStore.getState().saveToHistory(savedMatch('s1', id));
    expect(useEbadStore.getState().matches[0]?.linkedMatchId).toBe('s1');
  });

  it('la revanche ne vole pas la liaison du premier match', () => {
    const id = useEbadStore.getState().addMatch(input()) as string;
    useMatchStore.getState().saveToHistory(savedMatch('s1', id));
    useMatchStore.getState().saveToHistory(savedMatch('s2', id));
    expect(useEbadStore.getState().matches[0]?.linkedMatchId).toBe('s1');
  });

  it('supprimer le match scoré retire la liaison', () => {
    const id = useEbadStore.getState().addMatch(input()) as string;
    useMatchStore.getState().saveToHistory(savedMatch('s1', id));
    useMatchStore.getState().removeFromHistory('s1');
    expect(useEbadStore.getState().matches[0]?.linkedMatchId).toBeUndefined();
  });
});

describe('import depuis le connecteur', () => {
  it('ajoute les nouveaux matchs et met à jour ceux déjà importés', () => {
    const store = useEbadStore.getState();
    const first = store.importMatches([
      input({ remoteId: 'ffbad:t:1', court: '1' }),
      input({ remoteId: 'ffbad:t:2' }),
    ]);
    expect(first).toEqual({ added: 2, updated: 0 });
    const imported = useEbadStore
      .getState()
      .matches.find(m => m.remoteId === 'ffbad:t:1');
    if (!imported) throw new Error('match importé introuvable');
    useEbadStore.getState().link(imported.id, 's1');

    const second = useEbadStore.getState().importMatches([
      input({
        remoteId: 'ffbad:t:1',
        court: '5',
        reportedScore: [
          { team1: 15, team2: 10 },
          { team1: 15, team2: 12 },
        ],
      }),
    ]);
    expect(second).toEqual({ added: 0, updated: 1 });
    const matches = useEbadStore.getState().matches;
    expect(matches).toHaveLength(2);
    const updated = matches.find(m => m.remoteId === 'ffbad:t:1');
    expect(updated?.id).toBe(imported.id);
    expect(updated?.court).toBe('5');
    expect(updated?.linkedMatchId).toBe('s1');
    expect(updated?.reportedScore).toHaveLength(2);
  });

  it('sans résultat officiel, garde le score recopié à la main', () => {
    const score = [
      { team1: 15, team2: 3 },
      { team1: 15, team2: 4 },
    ];
    useEbadStore
      .getState()
      .importMatches([input({ remoteId: 'ffbad:t:9', reportedScore: score })]);
    useEbadStore.getState().importMatches([input({ remoteId: 'ffbad:t:9' })]);
    expect(useEbadStore.getState().matches[0]?.reportedScore).toEqual(score);
  });

  it('une modification à la main garde l’identifiant distant', () => {
    useEbadStore.getState().importMatches([input({ remoteId: 'ffbad:t:3' })]);
    const [m] = useEbadStore.getState().matches;
    if (!m) throw new Error('match importé introuvable');
    useEbadStore.getState().updateMatch(m.id, input({ court: '7' }));
    expect(useEbadStore.getState().matches[0]?.remoteId).toBe('ffbad:t:3');
  });
});
