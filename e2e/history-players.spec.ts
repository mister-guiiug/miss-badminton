import { test, expect, type Page } from '@playwright/test';

/**
 * L'historique dans un vrai navigateur.
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
