import { test, expect } from '@playwright/test';

test.describe('Navigation @smoke', () => {
  test('la page d\'accueil se charge correctement @critical', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /miss badminton/i })).toBeVisible();
  });

  test('navigation vers le match @smoke', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /nouveau match/i }).click();
    await expect(page).toHaveURL(/\/match/);
  });

  test('navigation vers l\'historique @smoke', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /historique/i }).first().click();
    await expect(page).toHaveURL(/\/historique/);
  });
});
