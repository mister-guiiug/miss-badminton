import { describe, expect, it } from 'vitest';
import {
  displayName,
  indexById,
  matchInvolves,
  migratePlayers,
  playerKey,
  playersInMatches,
  renameInMatches,
  upsertPlayer,
  type Player,
} from './players';
import { SavedMatchArraySchema } from './schemas';
import type { SavedMatch } from './schemas';
import { must } from './test/must';

/**
 * L'INSTANTANÉ. Un `mb_match_history` tel qu'il existe chez un utilisateur
 * d'avant les profils : aucun `primaryId`, des simples et des doubles, la
 * même personne écrite de trois façons (« Anass », « anass », «  Anass  »),
 * un partenaire qui n'apparaît qu'en double, et DEUX PERSONNES QUI PORTENT
 * LE MÊME NOM — le cas qui oblige à écrire une règle.
 *
 * Il passe par `SavedMatchArraySchema` : si le schéma n'acceptait plus un
 * match sans identifiant de joueur, ce test tomberait ici, et c'est
 * exactement l'endroit où il doit tomber.
 */
const LEGACY_SNAPSHOT: unknown[] = [
  {
    id: 'm-5',
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
    setScores: [
      { team1: 21, team2: 18 },
      { team1: 21, team2: 16 },
    ],
    finalSetWins: { team1: 2, team2: 0 },
    winner: 'team1',
  },
  {
    id: 'm-4',
    completedAt: 1_755_000_000_000,
    config: {
      type: 'doubles',
      sets: 2,
      points: 21,
      cap: 30,
      sideChange: 'decisive',
      team1: { primary: 'anass', partner: 'Zoé', id: 'A' },
      team2: { primary: 'Guillaume', partner: 'Léa', id: 'B' },
    },
    setScores: [
      { team1: 19, team2: 21 },
      { team1: 21, team2: 12 },
      { team1: 21, team2: 19 },
    ],
    finalSetWins: { team1: 2, team2: 1 },
    winner: 'team1',
  },
  {
    id: 'm-3',
    completedAt: 1_754_000_000_000,
    config: {
      type: 'singles',
      sets: 1,
      points: 11,
      cap: null,
      sideChange: 'each-set',
      team1: { primary: '  Anass  ', id: 'A' },
      team2: { primary: 'Zoe', id: 'B' },
    },
    setScores: [{ team1: 11, team2: 7 }],
    finalSetWins: { team1: 1, team2: 0 },
    winner: 'team1',
  },
  {
    // Les deux « Alex » du club. Rien dans la donnée ne les sépare.
    id: 'm-2',
    completedAt: 1_753_000_000_000,
    config: {
      type: 'singles',
      sets: 1,
      points: 21,
      cap: null,
      sideChange: 'each-set',
      team1: { primary: 'Alex', id: 'A' },
      team2: { primary: 'Guillaume', id: 'B' },
    },
    setScores: [{ team1: 15, team2: 21 }],
    finalSetWins: { team1: 0, team2: 1 },
    winner: 'team2',
  },
  {
    id: 'm-1',
    completedAt: 1_752_000_000_000,
    config: {
      type: 'singles',
      sets: 1,
      points: 21,
      cap: null,
      sideChange: 'each-set',
      team1: { primary: 'Alex', id: 'A' },
      team2: { primary: 'Zoé', id: 'B' },
    },
    setScores: [{ team1: 21, team2: 12 }],
    finalSetWins: { team1: 1, team2: 0 },
    winner: 'team1',
  },
];

/** L'ancienne liste d'autocomplétion : « Nadia » n'a encore jamais joué. */
const LEGACY_NAMES = ['Anass', 'Guillaume', 'Nadia'];

function snapshot(): SavedMatch[] {
  const parsed = SavedMatchArraySchema.safeParse(LEGACY_SNAPSHOT);
  if (!parsed.success) throw new Error('instantané invalide : ' + parsed.error);
  return parsed.data;
}

/** Un générateur d'identifiants prévisible, pour lire les assertions. */
function counter() {
  let n = 0;
  return () => `p${++n}`;
}

describe('migration noms → profils, sur un instantané réel', () => {
  it("l'instantané d'avant la migration reste valide au schéma", () => {
    // Un match sans `primaryId` doit continuer de se lire : c'est la
    // condition pour que la migration ait quelque chose à migrer.
    expect(snapshot()).toHaveLength(5);
    expect(must(snapshot()[0]).config.team1.primaryId).toBeUndefined();
  });

  it('crée un profil par joueur distinct, sans en perdre aucun', () => {
    const { players, changed } = migratePlayers(snapshot(), {
      legacyNames: LEGACY_NAMES,
      makeId: counter(),
      now: 1_757_000_000_000,
    });
    expect(changed).toBe(true);
    // Anass, Guillaume, Zoé, Léa, Zoe, Alex, Nadia — sept.
    // « Zoé » et « Zoe » sont DEUX profils : les accents comptent.
    expect(players.map(p => p.name).sort()).toEqual([
      'Alex',
      'Anass',
      'Guillaume',
      'Léa',
      'Nadia',
      'Zoe',
      'Zoé',
    ]);
    // Aucun nom de l'historique ni de l'ancienne liste n'a disparu.
    const known = new Set(players.map(p => playerKey(p.name)));
    for (const name of [...LEGACY_NAMES, 'Zoé', 'Léa', 'Alex', 'Zoe']) {
      expect(known.has(playerKey(name))).toBe(true);
    }
  });

  it('pose un identifiant sur chaque place remplie de chaque match', () => {
    const { matches } = migratePlayers(snapshot(), { makeId: counter() });
    for (const m of matches) {
      expect(m.config.team1.primaryId).toBeTruthy();
      expect(m.config.team2.primaryId).toBeTruthy();
      const doubles = m.config.type === 'doubles';
      expect(Boolean(m.config.team1.partnerId)).toBe(doubles);
      expect(Boolean(m.config.team2.partnerId)).toBe(doubles);
    }
  });

  it('ne touche à rien d’autre : scores, dates, vainqueurs intacts', () => {
    const before = snapshot();
    const { matches } = migratePlayers(before, { makeId: counter() });
    expect(matches).toHaveLength(before.length);
    matches.forEach((m, i) => {
      const was = must(before[i], `match ${i}`);
      expect(m.id).toBe(was.id);
      expect(m.completedAt).toBe(was.completedAt);
      expect(m.setScores).toEqual(was.setScores);
      expect(m.finalSetWins).toEqual(was.finalSetWins);
      expect(m.winner).toBe(was.winner);
      // Le nom recopié dans le match n'est pas réécrit par la migration.
      expect(m.config.team1.primary).toBe(was.config.team1.primary);
      // Le côté de terrain ('A'/'B') n'est pas confondu avec un joueur.
      expect(m.config.team1.id).toBe('A');
      expect(m.config.team2.id).toBe('B');
    });
  });

  it('regroupe casse et espaces : « Anass », « anass » et «  Anass  » = un joueur', () => {
    const { players, matches } = migratePlayers(snapshot(), {
      makeId: counter(),
    });
    const homonymes = players.filter(p => playerKey(p.name) === 'anass');
    expect(homonymes).toHaveLength(1);
    const anass = must(homonymes[0], 'le profil Anass');
    // Les trois matchs d'Anass pointent le MÊME profil.
    const ids = matches
      .filter(m => ['m-5', 'm-4', 'm-3'].includes(m.id))
      .map(m => m.config.team1.primaryId);
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBe(anass.id);
    // Et le nom retenu est l'orthographe la plus RÉCENTE (m-5, en tête).
    expect(anass.name).toBe('Anass');
  });

  it('LA RÈGLE DES HOMONYMES : deux « Alex » deviennent un seul profil', () => {
    const { players, matches } = migratePlayers(snapshot(), {
      makeId: counter(),
    });
    expect(players.filter(p => p.name === 'Alex')).toHaveLength(1);
    const m2 = matches.find(m => m.id === 'm-2');
    const m1 = matches.find(m => m.id === 'm-1');
    // Assumé et documenté : rien dans la donnée ne sépare deux personnes qui
    // ont tapé le même nom. On fusionne — une fusion se voit dans un
    // classement et se répare en renommant ; une séparation arbitraire
    // éparpillerait l'historique sans que personne s'en aperçoive.
    expect(m2?.config.team1.primaryId).toBe(m1?.config.team1.primaryId);
  });

  it('est REJOUABLE : une seconde passe ne crée ni ne déplace rien', () => {
    const first = migratePlayers(snapshot(), {
      legacyNames: LEGACY_NAMES,
      makeId: counter(),
    });
    const second = migratePlayers(first.matches, {
      knownPlayers: first.players,
      legacyNames: LEGACY_NAMES,
      makeId: () => 'NE-DOIT-PAS-SERVIR',
    });
    expect(second.changed).toBe(false);
    expect(second.players).toEqual(first.players);
    expect(second.matches).toEqual(first.matches);
  });

  it('réattribue un identifiant orphelin depuis le nom recopié', () => {
    // Un profil supprimé depuis les Réglages laisse des matchs qui pointent
    // dans le vide : le match doit redevenir trouvable, pas rester muet.
    const orphan = snapshot().map(m => ({
      ...m,
      config: {
        ...m.config,
        team1: { ...m.config.team1, primaryId: 'disparu' },
      },
    }));
    const { players, matches } = migratePlayers(orphan, { makeId: counter() });
    const first = must(matches[0], 'le premier match');
    expect(first.config.team1.primaryId).not.toBe('disparu');
    expect(players.some(p => p.id === first.config.team1.primaryId)).toBe(true);
  });
});

describe('renommer : l’historique suit', () => {
  it('recopie le nouveau nom dans tous les matchs du joueur', () => {
    const { players, matches } = migratePlayers(snapshot(), {
      makeId: counter(),
    });
    const anass = must(
      players.find(p => p.name === 'Anass'),
      'le profil Anass'
    );
    const renamed = renameInMatches(matches, anass.id, 'Anass B.');
    expect(renamed.changed).toBe(true);
    const touched = renamed.matches.filter(
      m => m.config.team1.primary === 'Anass B.'
    );
    expect(touched.map(m => m.id).sort()).toEqual(['m-3', 'm-4', 'm-5']);
    // Les matchs des AUTRES n'ont pas bougé.
    expect(
      renamed.matches.find(m => m.id === 'm-1')?.config.team1.primary
    ).toBe('Alex');
  });

  it('le registre suffit à l’affichage même sans recopie', () => {
    const { players, matches } = migratePlayers(snapshot(), {
      makeId: counter(),
    });
    const anass = must(
      players.find(p => p.name === 'Anass'),
      'le profil Anass'
    );
    // On ne renomme QUE le registre, pas les matchs.
    const byId = indexById(
      players.map(p => (p.id === anass.id ? { ...p, name: 'Anass B.' } : p))
    );
    const first = must(matches[0], 'le premier match');
    expect(displayName(first.config.team1, 'primary', byId)).toBe('Anass B.');
    // Et le match, lui, porte toujours l'ancienne frappe : la vérité vient
    // du registre, la recopie n'est qu'un confort d'export.
    expect(first.config.team1.primary).toBe('Anass');
  });

  it('ne renomme rien quand le joueur n’apparaît nulle part', () => {
    const { matches } = migratePlayers(snapshot(), { makeId: counter() });
    const untouched = renameInMatches(matches, 'inconnu', 'Peu importe');
    expect(untouched.changed).toBe(false);
    expect(untouched.matches).toEqual(matches);
  });
});

describe('filtrer par joueur', () => {
  it('trouve les matchs d’un joueur par fragment de nom, accents ignorés', () => {
    const { players, matches } = migratePlayers(snapshot(), {
      makeId: counter(),
    });
    const byId = indexById(players);
    const found = matches.filter(m => matchInvolves(m, { text: 'zoe' }, byId));
    // « Zoé » (m-4, m-1) et « Zoe » (m-3) : la recherche ne tranche pas ce
    // que l'identité, elle, distingue.
    expect(found.map(m => m.id).sort()).toEqual(['m-1', 'm-3', 'm-4']);
  });

  it('filtre exactement par identifiant', () => {
    const { players, matches } = migratePlayers(snapshot(), {
      makeId: counter(),
    });
    const byId = indexById(players);
    const guillaume = players.find(p => p.name === 'Guillaume')!;
    const found = matches.filter(m =>
      matchInvolves(m, { id: guillaume.id }, byId)
    );
    expect(found.map(m => m.id).sort()).toEqual(['m-2', 'm-4', 'm-5']);
  });

  it('une recherche vide ne filtre rien', () => {
    const { players, matches } = migratePlayers(snapshot(), {
      makeId: counter(),
    });
    const byId = indexById(players);
    expect(
      matches.filter(m => matchInvolves(m, { text: '   ' }, byId))
    ).toHaveLength(5);
  });

  it('suit le renommage : le nouveau nom trouve les anciens matchs', () => {
    const { players, matches } = migratePlayers(snapshot(), {
      makeId: counter(),
    });
    const anass = players.find(p => p.name === 'Anass')!;
    const byId = indexById(
      players.map(p => (p.id === anass.id ? { ...p, name: 'Anass B.' } : p))
    );
    const found = matches.filter(m => matchInvolves(m, { text: 'B.' }, byId));
    expect(found.map(m => m.id).sort()).toEqual(['m-3', 'm-4', 'm-5']);
  });
});

describe('upsertPlayer', () => {
  it('rend le profil existant quand le nom est déjà connu', () => {
    const base: Player[] = [{ id: 'p1', name: 'Anass', createdAt: 1 }];
    const again = upsertPlayer(base, '  anass ');
    expect(again.changed).toBe(false);
    expect(again.player.id).toBe('p1');
    expect(again.players).toHaveLength(1);
  });

  it('crée un profil pour un nom inconnu', () => {
    const created = upsertPlayer([], 'Nadia', { makeId: () => 'p9', now: 42 });
    expect(created.changed).toBe(true);
    expect(created.player).toEqual({ id: 'p9', name: 'Nadia', createdAt: 42 });
  });
});

describe('playersInMatches', () => {
  it('ne garde que les profils qui ont effectivement joué', () => {
    const { players, matches } = migratePlayers(snapshot(), {
      legacyNames: LEGACY_NAMES,
      makeId: counter(),
    });
    const played = playersInMatches(matches, players);
    // Nadia est dans l'ancienne liste d'autocomplétion, jamais sur un terrain.
    expect(played.some(p => p.name === 'Nadia')).toBe(false);
    expect(played).toHaveLength(6);
  });
});
