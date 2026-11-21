import { test, expect, type Page } from '@playwright/test';

/**
 * Le suivi eBad, dans un vrai navigateur : un match recopié depuis eBad, un
 * match scoré dans l'historique, et l'association des deux.
 *
 * Le match eBad liste les équipes DANS L'AUTRE SENS que le match scoré : le
 * score à reporter doit être remis dans l'ordre eBad. Playwright tourne en
 * locale en-US ; les motifs acceptent les trois langues de l'app.
 */
const DAY = Date.now() - 60_000;

const HISTORY = [
  {
    id: 'h-1',
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
      { team1: 15, team2: 9 },
    ],
    finalSetWins: { team1: 2, team2: 0 },
    winner: 'team1',
  },
];

const EBAD = [
  {
    id: 'e-1',
    createdAt: DAY - 3_600_000,
    tournament: 'Tournoi de test',
    discipline: 'SH',
    round: 'P10 — Poule A',
    court: '3',
    team1: { primary: 'MARTIN Paul' },
    team2: { primary: 'DUPONT Jean' },
  },
];

async function seed(page: Page) {
  await page.addInitScript(
    ({ history, ebad }) => {
      try {
        localStorage.setItem('mb_match_history', JSON.stringify(history));
        localStorage.setItem('mb_ebad_matches', JSON.stringify(ebad));
        localStorage.setItem('mb_data_version', '2');
        localStorage.setItem('mb_welcome_tutorial_done', '1');
      } catch {
        /* ignore */
      }
    },
    { history: HISTORY, ebad: EBAD }
  );
}

test.describe('Tournois eBad @critical', () => {
  test('associer un match scoré donne le score dans l’ordre eBad', async ({
    page,
  }) => {
    await seed(page);
    await page.goto('/tournois');

    await expect(
      page.getByRole('heading', {
        name: /tournois ebad|ebad tournaments|torneos ebad/i,
        level: 1,
      })
    ).toBeVisible();
    await expect(page.getByText('MARTIN Paul')).toBeVisible();

    await page
      .getByRole('button', {
        name: /associer un match scoré|link a scored match|vincular un partido puntuado/i,
      })
      .click();

    // La suggestion : le seul match scoré, reconnu malgré l'ordre inversé.
    const candidate = page.getByRole('button', { name: /Jean Dupont/ });
    await expect(candidate).toBeVisible();
    await expect(candidate).toContainText(/suggéré|suggested|sugerido/i);
    await candidate.click();

    await expect(page.getByText('12-15 9-15')).toBeVisible();
  });
});
