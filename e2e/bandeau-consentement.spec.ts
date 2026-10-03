import { test, expect, type Page } from '@playwright/test';

/*
 * LE BANDEAU DE CONSENTEMENT NE RECOUVRE PAS L'ÉCRAN.
 *
 * Posé en haut et sorti du flux, il cachait le haut de l'écran courant :
 * titre, actions et filtres passaient dessous, sans défilement possible sur
 * une page courte. Relevé le 03/10/2026 en `mobile-chrome` par
 * `match-flow.spec.ts` : le toucher sur « 7 jours » tombait sur « Refuser ».
 * Le bandeau est désormais collant, en tête de `<main>`. Cette spec vérifie
 * sa PLACE, écran par écran, plutôt qu'un bouton : le prochain écran dont le
 * haut changera ne doit pas repasser dessous.
 */

const ECRANS = ['/', '/historique', '/parametres'];

async function premiereVisite(page: Page) {
  await page.addInitScript(() => {
    try {
      // Le tutoriel de bienvenue passé, le consentement jamais donné : le
      // bandeau est là, et aucune modale ne couvre l'écran.
      localStorage.setItem('mb_welcome_tutorial_done', '1');
    } catch {
      /* ignore */
    }
  });
}

test.describe('@critical bandeau de consentement', () => {
  for (const ecran of ECRANS) {
    test(`le titre de ${ecran} commence sous le bandeau`, async ({ page }) => {
      await premiereVisite(page);
      await page.goto(ecran);
      const bandeau = page.locator('[data-dwc="consent-banner"]');
      const titre = page.locator('main h1').first();
      await expect(bandeau).toBeVisible();
      await expect(titre).toBeVisible();
      // L'animation d'entrée du bandeau le décale de quelques pixels : on
      // mesure sa position d'arrivée.
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) animation.finish();
      });
      const b = await bandeau.boundingBox();
      const t = await titre.boundingBox();
      if (!b || !t) throw new Error('bandeau ou titre sans boîte');
      expect(t.y).toBeGreaterThanOrEqual(b.y + b.height);
    });
  }
});
