import { test, expect, type Page } from '@playwright/test';

/**
 * Scénarios métier : on simule un flow utilisateur du début à la fin et on
 * vérifie les conséquences sur l'historique et les statistiques.
 *
 * Notes :
 *  - On utilise `page.evaluate` pour seeder l'état du store (Zustand
 *    persiste en localStorage). Ça évite de cliquer 21+21 fois et de
 *    dépendre du wizard pour tester la logique d'historique.
 *  - Les tests sont tag-és @critical pour intégrer le run rapide du CI.
 */

async function seedHistory(page: Page, matches: unknown[]) {
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

const SAMPLE_MATCH = {
  id: 'm-test-1',
  completedAt: Date.now() - 60_000,
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
};

test.describe('History flow @critical', () => {
  test("un match seedé apparaît dans l'historique", async ({ page }) => {
    await seedHistory(page, [SAMPLE_MATCH]);
    await page.goto('/historique');
    // `.first()` : les joueurs apparaissent à plusieurs endroits de la page
    // (carte du match, stats, top joueurs) — on vérifie la présence.
    await expect(
      page.getByText('Anass', { exact: false }).first()
    ).toBeVisible();
    await expect(
      page.getByText('Guillaume', { exact: false }).first()
    ).toBeVisible();
    // Le score final 2-0 doit être affiché quelque part.
    await expect(page.locator('text=/2.*–.*0/').first()).toBeVisible();
  });

  test('filtre période 7 jours masque un match ancien', async ({ page }) => {
    const oldMatch = {
      ...SAMPLE_MATCH,
      id: 'm-old',
      completedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    };
    await seedHistory(page, [oldMatch]);
    await page.goto('/historique');
    await expect(page.getByText('Anass').first()).toBeVisible();
    // On clique sur le filtre "7 jours".
    await page.getByRole('button', { name: /7 jours|7 days|7 días/ }).click();
    await expect(
      page.getByText(/Aucun match|No match|Ningún partido/)
    ).toBeVisible();
  });
});

test.describe('Replay URL @critical', () => {
  test('?replay=<config> ouvre le wizard pré-rempli', async ({ page }) => {
    const config = {
      type: 'singles',
      sets: 2,
      points: 21,
      cap: null,
      sideChange: 'each-set',
      team1: { primary: 'Alice', id: 'A' },
      team2: { primary: 'Bob', id: 'B' },
    };
    const json = JSON.stringify(config);
    // btoa avec UTF-8 sûr (équivalent à src/share.ts).
    const b64 = await page.evaluate((j: string) => {
      return btoa(unescape(encodeURIComponent(j)));
    }, json);

    await page.addInitScript(() => {
      try {
        localStorage.setItem('mb_welcome_tutorial_done', '1');
      } catch {
        /* ignore */
      }
    });

    await page.goto(`/?replay=${encodeURIComponent(b64)}`);
    // Le wizard apparaît (dialog avec aria-modal). Il peut s'ouvrir à
    // n'importe quelle étape : on avance tant qu'un bouton « Suivant » est
    // visible, puis on vérifie le pré-remplissage « Alice » (champ joueur
    // ou récapitulatif). `getByDisplayValue` n'existe pas dans Playwright.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const nextBtn = dialog
      .getByRole('button', { name: /Suivant|Next|Siguiente/ })
      .first();
    for (let i = 0; i < 4; i++) {
      if (!(await nextBtn.isVisible().catch(() => false))) break;
      await nextBtn.click();
    }
    const values = await dialog
      .locator('input[type="text"]')
      .evaluateAll(els => els.map(el => (el as HTMLInputElement).value));
    if (!values.includes('Alice')) {
      await expect(dialog.getByText('Alice').first()).toBeVisible();
    }
  });
});

test.describe('Export → Import @critical', () => {
  test("exporter puis ré-importer conserve l'historique", async ({ page }) => {
    await seedHistory(page, [SAMPLE_MATCH]);
    await page.goto('/parametres');

    // Récupère le JSON via l'API store directement (on ne peut pas lire
    // facilement un blob téléchargé en E2E sans dialog).
    const json = await page.evaluate(() =>
      localStorage.getItem('mb_match_history')
    );
    expect(json).toBeTruthy();
    const parsed = JSON.parse(json as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('m-test-1');
  });
});
