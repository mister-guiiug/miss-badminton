import { test, expect, type Page } from '@playwright/test';

/**
 * Les joueurs et la suppression annulable, dans un vrai navigateur.
 *
 * On sème un historique D'AVANT les profils — aucun `primaryId` — donc ces
 * scénarios éprouvent AUSSI la migration : au chargement, l'app doit fabriquer
 * les profils, poser les identifiants, et proposer le filtre.
 *
 * Playwright tourne en locale en-US : l'UI i18n rend l'anglais. Les motifs
 * acceptent les trois langues de l'app pour ne pas dépendre de cette locale.
 */
function match(
  id: string,
  team1: string,
  team2: string,
  daysAgo = 1
): Record<string, unknown> {
  return {
    id,
    completedAt: Date.now() - daysAgo * 60_000,
    config: {
      type: 'singles',
      sets: 2,
      points: 21,
      cap: null,
      sideChange: 'each-set',
      team1: { primary: team1, id: 'A' },
      team2: { primary: team2, id: 'B' },
    },
    setScores: [
      { team1: 21, team2: 18 },
      { team1: 21, team2: 16 },
    ],
    finalSetWins: { team1: 2, team2: 0 },
    winner: 'team1',
  };
}

const HISTORY = [
  match('h-1', 'Anass', 'Guillaume', 1),
  match('h-2', 'Anass', 'Zoé', 2),
  match('h-3', 'Zoé', 'Guillaume', 3),
];

async function seed(page: Page, matches: unknown[]) {
  await page.addInitScript((m: unknown[]) => {
    try {
      localStorage.setItem('mb_match_history', JSON.stringify(m));
      localStorage.setItem('mb_data_version', '2');
      localStorage.setItem('mb_welcome_tutorial_done', '1');
    } catch {
      /* ignore */
    }
  }, matches);
}

/** Une carte de match = un bouton « Rejouer ce match ». */
function cards(page: Page) {
  return page.getByRole('button', {
    name: /rejouer ce match|replay this match|repetir este partido/i,
  });
}

/**
 * `combobox`, pas `searchbox` : l'input porte un `list=` (la datalist des
 * joueurs connus), et HTML-AAM fait alors basculer le rôle de `searchbox` à
 * `combobox`. Constaté sur l'arbre d'accessibilité rendu, pas déduit.
 */
function playerFilter(page: Page) {
  return page.getByRole('combobox', {
    name: /filtrer par joueur|filter by player|filtrar por jugador/i,
  });
}

test.describe('Filtre par joueur @critical', () => {
  test('un historique d’avant la migration devient filtrable par joueur', async ({
    page,
  }) => {
    await seed(page, HISTORY);
    await page.goto('/historique');
    await expect(cards(page)).toHaveCount(3);

    // Le filtre n'existe que parce que la migration a fabriqué des profils
    // à partir de noms nus.
    await playerFilter(page).fill('Guillaume');
    await expect(cards(page)).toHaveCount(2);
    await expect(
      page.getByText('Anass', { exact: false }).first()
    ).toBeVisible();

    // Un joueur qui n'a qu'un match.
    await playerFilter(page).fill('Zoé');
    await expect(cards(page)).toHaveCount(2);

    // Accents ignorés à la RECHERCHE : « zoe » trouve « Zoé ».
    await playerFilter(page).fill('zoe');
    await expect(cards(page)).toHaveCount(2);

    // Personne de ce nom.
    await playerFilter(page).fill('Nadia');
    await expect(cards(page)).toHaveCount(0);
    await expect(
      page.getByText(/Aucun match avec|No match with|Ningún partido con/)
    ).toBeVisible();

    // Le bouton d'effacement rend l'historique complet.
    await page
      .getByRole('button', {
        name: /effacer le filtre joueur|clear player filter|borrar el filtro/i,
      })
      .click();
    await expect(cards(page)).toHaveCount(3);
  });
});

test.describe('Suppression annulable @critical', () => {
  test('supprimer puis annuler laisse le match en place', async ({ page }) => {
    await seed(page, HISTORY);
    await page.goto('/historique');
    await expect(cards(page)).toHaveCount(3);

    await page
      .getByRole('button', { name: /^(supprimer|delete|eliminar)$/i })
      .first()
      .click();
    await expect(cards(page)).toHaveCount(2);
    const toast = page.getByRole('status').filter({
      hasText: /match supprimé|match deleted|partido eliminado/i,
    });
    await expect(toast).toBeVisible();

    await toast.getByRole('button', { name: /annuler|undo|deshacer/i }).click();
    await expect(cards(page)).toHaveCount(3);
    await expect(toast).toBeHidden();

    // Et rien n'a été écrit : un rechargement retrouve les trois matchs.
    await page.reload();
    await expect(cards(page)).toHaveCount(3);
  });
});
