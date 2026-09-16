// Suite a11y minimale (axe-core + Playwright) — template dev-pwa-config.
// Le tag @a11y permet de filtrer : `playwright test --grep @a11y`.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoA11yViolations } from '@mister-guiiug/dev-pwa-config/playwright-a11y';

test.describe('@a11y accessibilité', () => {
  test("page d'accueil sans violation WCAG A/AA", async ({ page }) => {
    await page.goto('/');
    /*
     * ATTENDRE QUE LES ANIMATIONS SOIENT FINIES, sinon axe mesure des couleurs
     * COMPOSÉES. Le tutoriel de bienvenue s'ouvre à la première visite et se
     * fond par-dessus la zone du bandeau de consentement : scanné à mi-course,
     * axe lit un fond intermédiaire (`#6c6b7f`, `#828282` relevés le
     * 16/09/2026) et refuse le contraste des boutons. Mesuré : une passe sur
     * trois échouait sans attente, zéro sur trois avec — l'échec se présentait
     * comme instable alors qu'il était temporel.
     *
     * On attend l'état stable plutôt qu'un délai fixe : une durée arbitraire
     * redeviendrait fausse le jour où l'animation change.
     */
    await page.waitForFunction(
      () => document.getAnimations().every(a => a.playState !== 'running'),
      undefined,
      { timeout: 5000 }
    );
    await expectNoA11yViolations(page, AxeBuilder, expect);
  });
});
