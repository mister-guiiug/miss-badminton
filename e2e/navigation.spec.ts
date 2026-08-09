import { test, expect } from '@playwright/test';

// Le tutoriel de bienvenue (modal) s'affiche au premier lancement et
// recouvre la page : on le marque comme vu pour tester la navigation.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('mb_welcome_tutorial_done', '1');
    } catch {
      /* ignore */
    }
  });
});

test.describe('Navigation @smoke', () => {
  test("la page d'accueil se charge correctement @critical", async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /miss badminton/i }).first()
    ).toBeVisible();
  });

  test('ouverture du wizard nouveau match @smoke', async ({ page }) => {
    await page.goto('/');
    // Bilingue : Playwright tourne en locale en-US → l'UI i18n rend l'anglais.
    // « Nouveau match » est un bouton qui ouvre le wizard (plus un lien /match).
    await page
      .getByRole('button', { name: /nouveau match|new match/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test("navigation vers l'historique @smoke", async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('link', { name: /historique|history/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/historique/);
  });
});
