import { test, expect } from '@playwright/test';

/**
 * HORS LIGNE, C'EST-À-DIRE DANS UN GYMNASE.
 *
 * L'application n'a pas de serveur : tout vit dans le navigateur. Cette
 * propriété ne vaut pourtant rien tant que le SERVICE WORKER ne sert pas la
 * coquille sans réseau — sinon l'écran est blanc avant même que le stockage
 * local ait son mot à dire, et c'est exactement là que l'app doit servir :
 * sous-sol, salle municipale, réseau saturé un samedi de tournoi.
 *
 * CE QUI EST VÉRIFIÉ ICI EST LE COMPORTEMENT, PLUS L'ANNONCE. L'app affichait
 * son état de connexion à deux endroits — une ligne permanente dans le menu,
 * une pastille flottante hors ligne. Les deux ont été retirées : sans serveur,
 * « en ligne » et « hors ligne » ne distinguent rien, et l'utilisateur n'avait
 * aucune décision à prendre à leur lecture. Ce qui compte est que l'app
 * FONCTIONNE sans réseau, et c'est ce que ces parcours prouvent.
 *
 * Ils tournent sur un BUILD de production (`preview: true` dans la
 * configuration Playwright), donc avec le vrai service worker.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('mb_welcome_tutorial_done', '1');
    } catch {
      /* ignore */
    }
  });
});

/**
 * Le service worker s'installe à la première visite mais ne CONTRÔLE la page
 * qu'après un rechargement (`registerType: 'prompt'`, pas de `clientsClaim`).
 * Sans cette attente, couper le réseau juste après le premier rendu testerait
 * une page que personne ne sert.
 */
async function attendreLeServiceWorker(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => navigator.serviceWorker?.ready !== undefined
  );
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(
    () => navigator.serviceWorker.controller !== null,
    undefined,
    { timeout: 15_000 }
  );
}

test.describe('Hors ligne @critical', () => {
  test("l'app se relance sans réseau", async ({ page, context }) => {
    await page.goto('/');
    await attendreLeServiceWorker(page);

    await context.setOffline(true);
    await page.reload();

    // La coquille est servie par le cache : le titre est là.
    await expect(
      page.getByRole('heading', { name: /miss badminton/i }).first()
    ).toBeVisible();
  });

  test('un lien profond rechargé hors ligne retombe sur la coquille', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await attendreLeServiceWorker(page);

    await context.setOffline(true);
    // Le piège des SPA sur GitHub Pages : l'URL n'existe pas comme fichier.
    // C'est `navigateFallback` qui doit rendre `index.html`.
    await page.goto('/historique');
    await expect(
      page.getByRole('heading', { name: /historique|history/i }).first()
    ).toBeVisible();
  });

  test('un match se joue et se garde entièrement hors ligne', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await attendreLeServiceWorker(page);
    await context.setOffline(true);
    await page.reload();

    await page
      .getByRole('button', { name: /nouveau match|new match/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
