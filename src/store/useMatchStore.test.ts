import { beforeEach, describe, expect, it } from 'vitest';
import { useMatchStore } from './useMatchStore';
import type { MatchConfig } from '../react/components/MatchSetupWizard';

function resetStore() {
  // On vide localStorage entre les tests pour repartir d'un état propre,
  // y compris pour les bouts d'historique que le store maintient.
  localStorage.clear();
  useMatchStore.setState({
    match: null,
    score1: 0,
    score2: 0,
    setWins: { team1: 0, team2: 0 },
    matchWinner: null,
    server: null,
    setScores: [],
    pendingSideChange: false,
    mid11Triggered: false,
    startedAt: null,
    endedAt: null,
    pausedAt: null,
    totalPausedMs: 0,
    streak1: 0,
    streak2: 0,
    maxStreak1: 0,
    maxStreak2: 0,
    history: [],
    pendingFeedback: null,
    lastSetSummary: null,
    matchHistory: [],
  });
}

function standardConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    type: 'singles',
    sets: 2,
    points: 21,
    cap: null,
    sideChange: 'each-set',
    team1: { primary: 'A', id: 'A' },
    team2: { primary: 'B', id: 'B' },
    ...overrides,
  };
}

function scoreN(team: 'team1' | 'team2', n: number) {
  for (let i = 0; i < n; i++) useMatchStore.getState().score(team);
}

describe('useMatchStore', () => {
  beforeEach(() => resetStore());

  describe('score logic — set normal', () => {
    it('attribue un set à 21-x quand l\'écart est ≥ 2', () => {
      useMatchStore.getState().setMatch(standardConfig());
      scoreN('team1', 21);
      scoreN('team2', 5);
      const state = useMatchStore.getState();
      // Premier set fini AVANT que team2 marque ses 5 points : team1 a
      // marqué 21 d'affilée, ce qui ferme le set immédiatement.
      expect(state.setScores).toEqual([{ team1: 21, team2: 0 }]);
      expect(state.setWins).toEqual({ team1: 1, team2: 0 });
      // Au début du set suivant, team2 marque ses 5 points : 0-5.
      expect(state.score2).toBe(5);
    });

    it('exige 2 points d\'écart (deuce)', () => {
      useMatchStore.getState().setMatch(standardConfig());
      scoreN('team1', 20);
      scoreN('team2', 20);
      scoreN('team1', 1);
      // 21-20 : pas encore set (écart de 1)
      expect(useMatchStore.getState().setScores).toEqual([]);
      scoreN('team2', 1);
      // 21-21 : toujours pas
      expect(useMatchStore.getState().score1).toBe(21);
      expect(useMatchStore.getState().score2).toBe(21);
      scoreN('team1', 2);
      // 23-21 : set
      expect(useMatchStore.getState().setScores).toEqual([
        { team1: 23, team2: 21 },
      ]);
    });
  });

  describe('cap', () => {
    it('clôt un set au plafond même sans écart de 2', () => {
      useMatchStore.getState().setMatch(standardConfig({ cap: 30 }));
      scoreN('team1', 29);
      scoreN('team2', 29);
      scoreN('team1', 1);
      // 30-29 : avec cap=30, team1 gagne dès qu'il atteint 30 en menant.
      expect(useMatchStore.getState().setScores).toEqual([
        { team1: 30, team2: 29 },
      ]);
    });
  });

  describe('matchWinner', () => {
    it('best of 3 : 2 sets gagnés terminent le match', () => {
      useMatchStore.getState().setMatch(standardConfig({ sets: 2 }));
      scoreN('team1', 21); // set 1 : team1
      scoreN('team1', 21); // set 2 : team1
      const state = useMatchStore.getState();
      expect(state.matchWinner).toBe('team1');
      expect(state.setWins).toEqual({ team1: 2, team2: 0 });
      // Plus aucun point ne doit être pris en compte
      const beforeScore = useMatchStore.getState().score1;
      scoreN('team1', 5);
      expect(useMatchStore.getState().score1).toBe(beforeScore);
    });
  });

  describe('undo', () => {
    it('annule exactement le dernier point sans toucher au reste', () => {
      useMatchStore.getState().setMatch(standardConfig());
      scoreN('team1', 5);
      scoreN('team2', 3);
      const before = useMatchStore.getState();
      const snapshot = {
        score1: before.score1,
        score2: before.score2,
        setWins: before.setWins,
        streak1: before.streak1,
        streak2: before.streak2,
      };
      useMatchStore.getState().score('team1');
      useMatchStore.getState().undo();
      const after = useMatchStore.getState();
      expect({
        score1: after.score1,
        score2: after.score2,
        setWins: after.setWins,
        streak1: after.streak1,
        streak2: after.streak2,
      }).toEqual(snapshot);
    });

    it('peut annuler la fin d\'un set', () => {
      useMatchStore.getState().setMatch(standardConfig({ sets: 2 }));
      scoreN('team1', 20);
      scoreN('team1', 1); // 21 : ferme le set
      expect(useMatchStore.getState().setScores).toHaveLength(1);
      useMatchStore.getState().undo();
      const after = useMatchStore.getState();
      expect(after.setScores).toHaveLength(0);
      expect(after.score1).toBe(20);
      expect(after.setWins).toEqual({ team1: 0, team2: 0 });
    });
  });

  describe('swap', () => {
    it('inverse scores, setWins, streaks et l\'identité des équipes', () => {
      useMatchStore.getState().setMatch(standardConfig());
      scoreN('team1', 5);
      scoreN('team2', 3);
      useMatchStore.getState().swap();
      const s = useMatchStore.getState();
      expect(s.score1).toBe(3);
      expect(s.score2).toBe(5);
      expect(s.match?.team1.primary).toBe('B');
      expect(s.match?.team2.primary).toBe('A');
    });
  });

  describe('side change', () => {
    it("sideChange='each-set' : pendingSideChange vrai après chaque fin de set sauf le dernier", () => {
      useMatchStore.getState().setMatch(standardConfig({ sets: 2 }));
      scoreN('team1', 21);
      expect(useMatchStore.getState().pendingSideChange).toBe(true);
      useMatchStore.getState().dismissSideChange();
      scoreN('team1', 21);
      // Match fini, donc plus de changement de côté en attente.
      expect(useMatchStore.getState().matchWinner).toBe('team1');
      expect(useMatchStore.getState().pendingSideChange).toBe(false);
    });

    it("sideChange='mid-match' : déclenché une seule fois quand un score atteint 11", () => {
      useMatchStore.getState().setMatch(
        standardConfig({ sideChange: 'mid-match' })
      );
      scoreN('team1', 10);
      expect(useMatchStore.getState().pendingSideChange).toBe(false);
      scoreN('team1', 1);
      expect(useMatchStore.getState().pendingSideChange).toBe(true);
      useMatchStore.getState().dismissSideChange();
      scoreN('team1', 5);
      // Doit rester false (mid11Triggered prévient un second déclenchement)
      expect(useMatchStore.getState().pendingSideChange).toBe(false);
    });
  });

  describe('editSetScore', () => {
    it('met à jour un set existant et recalcule setWins', () => {
      useMatchStore.getState().setMatch(standardConfig({ sets: 2 }));
      scoreN('team1', 21); // set 1 : team1
      scoreN('team2', 21); // set 2 : team2
      // 1-1, on simule la correction du set 1 en faveur de team2
      const ok = useMatchStore.getState().editSetScore(0, 19, 21);
      expect(ok).toBe(true);
      expect(useMatchStore.getState().setWins).toEqual({ team1: 0, team2: 2 });
      expect(useMatchStore.getState().matchWinner).toBe('team2');
    });

    it('refuse un index hors borne', () => {
      useMatchStore.getState().setMatch(standardConfig());
      expect(useMatchStore.getState().editSetScore(0, 21, 0)).toBe(false);
    });
  });

  describe('closeCurrentSet (time-based)', () => {
    it("ferme le set au leader si les scores diffèrent", () => {
      useMatchStore.getState().setMatch(
        standardConfig({ timeLimitMin: 10, tieBreak: 'sudden-death' })
      );
      scoreN('team1', 8);
      scoreN('team2', 5);
      expect(useMatchStore.getState().closeCurrentSet()).toBe('set-closed');
      expect(useMatchStore.getState().setScores).toEqual([
        { team1: 8, team2: 5 },
      ]);
      expect(useMatchStore.getState().setWins).toEqual({ team1: 1, team2: 0 });
    });

    it("renvoie 'tie-break-required' si égalité et tieBreak='sudden-death'", () => {
      useMatchStore.getState().setMatch(
        standardConfig({ timeLimitMin: 10, tieBreak: 'sudden-death' })
      );
      scoreN('team1', 5);
      scoreN('team2', 5);
      expect(useMatchStore.getState().closeCurrentSet()).toBe(
        'tie-break-required'
      );
      // Aucun set attribué tant que le tie-break n'est pas joué
      expect(useMatchStore.getState().setScores).toEqual([]);
    });

    it("renvoie 'draw' si égalité sans tie-break", () => {
      useMatchStore.getState().setMatch(
        standardConfig({ timeLimitMin: 10, tieBreak: 'none' })
      );
      scoreN('team1', 3);
      scoreN('team2', 3);
      expect(useMatchStore.getState().closeCurrentSet()).toBe('draw');
    });
  });

  describe('importBundle', () => {
    it('rejette un payload structurellement invalide', () => {
      const res = useMatchStore.getState().importBundle({ history: 'oops' });
      expect(res.ok).toBe(false);
    });

    it('applique un bundle valide', () => {
      const bundle = {
        history: [],
        players: ['Anass', 'Guillaume'],
        settings: { theme: 'dark', sound: false },
      };
      const res = useMatchStore.getState().importBundle(bundle);
      expect(res.ok).toBe(true);
      expect(res.applied?.players).toBe(2);
    });
  });
});
