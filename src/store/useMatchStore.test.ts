import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UNDO_DELETE_MS, useMatchStore } from './useMatchStore';
import { storage } from '../storage';
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
    pendingTieBreak: false,
    currentSetStartedAt: null,
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
    pendingDeletion: null,
    players: [],
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
    it("attribue un set à 21-x quand l'écart est ≥ 2", () => {
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

    it("exige 2 points d'écart (deuce)", () => {
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
      // On amène d'abord à 20-20 sinon team1 ferme le set à 21-0.
      scoreN('team1', 20);
      scoreN('team2', 20);
      // Puis on monte en deuce jusqu'à 29-29 en alternant.
      for (let i = 0; i < 9; i++) {
        useMatchStore.getState().score('team1');
        useMatchStore.getState().score('team2');
      }
      expect(useMatchStore.getState().score1).toBe(29);
      expect(useMatchStore.getState().score2).toBe(29);
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

    it("peut annuler la fin d'un set", () => {
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
    it("inverse scores, setWins, streaks et l'identité des équipes", () => {
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
      useMatchStore
        .getState()
        .setMatch(standardConfig({ sideChange: 'mid-match' }));
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
    it('ferme le set au leader si les scores diffèrent', () => {
      useMatchStore
        .getState()
        .setMatch(
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
      useMatchStore
        .getState()
        .setMatch(
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
      useMatchStore
        .getState()
        .setMatch(standardConfig({ timeLimitMin: 10, tieBreak: 'none' }));
      scoreN('team1', 3);
      scoreN('team2', 3);
      expect(useMatchStore.getState().closeCurrentSet()).toBe('draw');
    });

    it("après 'tie-break-required', un seul point ferme le set", () => {
      useMatchStore
        .getState()
        .setMatch(
          standardConfig({ timeLimitMin: 10, tieBreak: 'sudden-death' })
        );
      scoreN('team1', 4);
      scoreN('team2', 4);
      // closeCurrentSet demande un tie-break ; pendingTieBreak doit être vrai
      expect(useMatchStore.getState().closeCurrentSet()).toBe(
        'tie-break-required'
      );
      expect(useMatchStore.getState().pendingTieBreak).toBe(true);

      // Le prochain point ferme immédiatement le set (pas besoin d'écart 2,
      // pas besoin d'atteindre les 21 — c'est la mort subite).
      useMatchStore.getState().score('team1');
      const s = useMatchStore.getState();
      expect(s.setScores).toEqual([{ team1: 5, team2: 4 }]);
      expect(s.setWins).toEqual({ team1: 1, team2: 0 });
      // Le flag est consommé.
      expect(s.pendingTieBreak).toBe(false);
    });

    it('currentSetStartedAt se positionne au premier point puis se reset à la fin du set', () => {
      useMatchStore.getState().setMatch(standardConfig({ timeLimitMin: 10 }));
      expect(useMatchStore.getState().currentSetStartedAt).toBeNull();
      useMatchStore.getState().score('team1');
      expect(typeof useMatchStore.getState().currentSetStartedAt).toBe(
        'number'
      );
      // Fin du set : la valeur doit retomber à null pour démarrer un nouveau
      // décompte au point suivant.
      scoreN('team1', 20);
      expect(useMatchStore.getState().setScores).toHaveLength(1);
      expect(useMatchStore.getState().currentSetStartedAt).toBeNull();
    });
  });

  describe('editHistorySetScore', () => {
    function saveSampleMatch(id: string) {
      useMatchStore.getState().saveToHistory({
        id,
        completedAt: Date.now(),
        config: standardConfig({ sets: 2 }),
        setScores: [
          { team1: 21, team2: 18 },
          { team1: 19, team2: 21 },
          { team1: 21, team2: 15 },
        ],
        finalSetWins: { team1: 2, team2: 1 },
        winner: 'team1',
      });
    }

    it("met à jour un set d'un match passé et recalcule winner", () => {
      saveSampleMatch('m1');
      // Inverser le résultat du set 3 → team2 gagne le match 1-2.
      const ok = useMatchStore.getState().editHistorySetScore('m1', 2, 15, 21);
      expect(ok).toBe(true);
      const match = useMatchStore
        .getState()
        .matchHistory.find(m => m.id === 'm1');
      expect(match?.setScores[2]).toEqual({ team1: 15, team2: 21 });
      expect(match?.finalSetWins).toEqual({ team1: 1, team2: 2 });
      expect(match?.winner).toBe('team2');
    });

    it('refuse un matchId inconnu ou un index hors borne', () => {
      saveSampleMatch('m2');
      expect(
        useMatchStore.getState().editHistorySetScore('inconnu', 0, 0, 0)
      ).toBe(false);
      expect(useMatchStore.getState().editHistorySetScore('m2', 99, 0, 0)).toBe(
        false
      );
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

    /**
     * L'export doit marcher DANS LES DEUX SENS, y compris à la lecture d'un
     * fichier produit AVANT les profils : `players` y est une liste de noms,
     * et les matchs n'ont aucun identifiant de joueur.
     */
    it("importe un bundle d'AVANT la migration et reconstruit les profils", () => {
      const bundle = {
        version: '0.1.0',
        history: [
          {
            id: 'old-1',
            completedAt: 1_756_000_000_000,
            config: {
              type: 'singles',
              sets: 2,
              points: 21,
              cap: null,
              sideChange: 'each-set',
              team1: { primary: 'Anass', id: 'A' },
              team2: { primary: 'Guillaume', id: 'B' },
            },
            setScores: [{ team1: 21, team2: 18 }],
            finalSetWins: { team1: 1, team2: 0 },
            winner: 'team1',
          },
        ],
        players: ['Anass', 'Guillaume', 'Nadia'],
      };
      const res = useMatchStore.getState().importBundle(bundle);
      expect(res.ok).toBe(true);
      expect(res.applied?.history).toBe(1);

      const state = useMatchStore.getState();
      // Les trois noms du fichier sont devenus des profils…
      expect(state.players.map(p => p.name).sort()).toEqual([
        'Anass',
        'Guillaume',
        'Nadia',
      ]);
      // …et le match importé les DÉSIGNE.
      const imported = state.matchHistory.find(m => m.id === 'old-1');
      const anass = state.players.find(p => p.name === 'Anass');
      expect(imported?.config.team1.primaryId).toBe(anass?.id);
      expect(imported?.setScores).toEqual([{ team1: 21, team2: 18 }]);
    });

    it('un bundle récent garde les identifiants du fichier', () => {
      const bundle = {
        history: [
          {
            id: 'new-1',
            completedAt: 1_756_000_000_000,
            config: {
              type: 'singles',
              sets: 2,
              points: 21,
              cap: null,
              sideChange: 'each-set',
              team1: { primary: 'Anass', id: 'A', primaryId: 'p-anass' },
              team2: { primary: 'Guillaume', id: 'B', primaryId: 'p-gui' },
            },
            setScores: [{ team1: 21, team2: 18 }],
            finalSetWins: { team1: 1, team2: 0 },
            winner: 'team1',
          },
        ],
        players: ['Anass', 'Guillaume'],
        playerProfiles: [
          { id: 'p-anass', name: 'Anass', createdAt: 1 },
          { id: 'p-gui', name: 'Guillaume', createdAt: 2 },
        ],
      };
      const res = useMatchStore.getState().importBundle(bundle);
      expect(res.ok).toBe(true);
      const state = useMatchStore.getState();
      expect(state.players.map(p => p.id).sort()).toEqual(['p-anass', 'p-gui']);
      expect(
        state.matchHistory.find(m => m.id === 'new-1')?.config.team1.primaryId
      ).toBe('p-anass');
    });
  });

  /**
   * V12 — ANNULER REMPLACE CONFIRMER. Supprimer une ligne d'historique ne
   * demande toujours rien, mais la ligne ne quitte le stockage qu'à
   * l'expiration du délai.
   */
  describe('suppression annulable', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    function saveOne(id: string) {
      useMatchStore.getState().saveToHistory({
        id,
        completedAt: Date.now(),
        config: standardConfig(),
        setScores: [{ team1: 21, team2: 18 }],
        finalSetWins: { team1: 1, team2: 0 },
        winner: 'team1',
      });
    }

    it('supprimer, annuler → le match est là', () => {
      saveOne('m1');
      useMatchStore.getState().requestRemoveFromHistory('m1');
      // Rien n'a encore été écrit : le match est seulement « en attente ».
      expect(useMatchStore.getState().pendingDeletion?.id).toBe('m1');
      expect(localStorage.getItem('mb_match_history')).toContain('m1');

      useMatchStore.getState().undoPendingRemoval();
      vi.advanceTimersByTime(UNDO_DELETE_MS * 2);

      expect(useMatchStore.getState().pendingDeletion).toBeNull();
      expect(useMatchStore.getState().matchHistory.map(m => m.id)).toEqual([
        'm1',
      ]);
      expect(localStorage.getItem('mb_match_history')).toContain('m1');
    });

    it("supprimer, laisser filer → il n'y est plus", () => {
      saveOne('m1');
      useMatchStore.getState().requestRemoveFromHistory('m1');
      expect(useMatchStore.getState().matchHistory).toHaveLength(1);

      vi.advanceTimersByTime(UNDO_DELETE_MS);

      expect(useMatchStore.getState().pendingDeletion).toBeNull();
      expect(useMatchStore.getState().matchHistory).toHaveLength(0);
      expect(localStorage.getItem('mb_match_history')).not.toContain('m1');
    });

    it('une seconde suppression valide la première', () => {
      saveOne('m1');
      saveOne('m2');
      useMatchStore.getState().requestRemoveFromHistory('m2');
      useMatchStore.getState().requestRemoveFromHistory('m1');
      // m2 est parti pour de bon, m1 est encore rattrapable.
      expect(useMatchStore.getState().matchHistory.map(m => m.id)).toEqual([
        'm1',
      ]);
      expect(useMatchStore.getState().pendingDeletion?.id).toBe('m1');
      useMatchStore.getState().undoPendingRemoval();
      vi.advanceTimersByTime(UNDO_DELETE_MS * 2);
      expect(useMatchStore.getState().matchHistory.map(m => m.id)).toEqual([
        'm1',
      ]);
    });

    it('effacer tout annule la suppression en attente sans la rejouer', () => {
      saveOne('m1');
      useMatchStore.getState().requestRemoveFromHistory('m1');
      useMatchStore.getState().clearHistory();
      expect(useMatchStore.getState().pendingDeletion).toBeNull();
      // Le minuteur ne doit plus rien écrire après coup.
      expect(() => vi.advanceTimersByTime(UNDO_DELETE_MS * 2)).not.toThrow();
      expect(useMatchStore.getState().matchHistory).toHaveLength(0);
    });

    it('ignore une demande sur un match absent', () => {
      useMatchStore.getState().requestRemoveFromHistory('fantome');
      expect(useMatchStore.getState().pendingDeletion).toBeNull();
    });
  });

  describe('registre des joueurs', () => {
    it('un profil créé par le wizard entre dans le magasin au démarrage du match', () => {
      // Le wizard appelle `storage.rememberPlayer` puis `setMatch` : le
      // profil est écrit dans le stockage, pas dans le magasin. Sans la
      // relecture faite par `setMatch`, un joueur saisi pour la première
      // fois resterait invisible des Réglages — donc impossible à renommer
      // — jusqu'au prochain rechargement.
      const created = storage.rememberPlayer('Nadia');
      expect(created?.name).toBe('Nadia');
      expect(useMatchStore.getState().players).toHaveLength(0);

      useMatchStore.getState().setMatch(
        standardConfig({
          team1: { primary: 'Nadia', id: 'A', primaryId: created?.id },
        })
      );

      expect(useMatchStore.getState().players.map(p => p.name)).toContain(
        'Nadia'
      );
    });
  });
});
