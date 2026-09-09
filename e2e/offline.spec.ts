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
 * Ces parcours tournent sur un BUILD de production (`preview: true` dans la
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

/**
 * Le menu est une barre latérale au-dessus de `lg:` et un tiroir en dessous :
 * sur Pixel 5 ou iPhone 12, rien n'est visible tant qu'on n'a pas appuyé sur
 * ☰. Ce helper rend le parcours identique sur les cinq navigateurs de la
 * matrice, ET RETOURNE LE MENU OUVERT — les deux existent dans le document
 * (la barre latérale est masquée par le CSS, pas retirée), donc chercher un
 * texte dans la page entière en trouve DEUX. C'est la matrice mobile qui l'a
 * dit, et elle avait raison : une assertion doit viser le menu qu'on regarde.
 */
async function ouvrirLeMenu(page: import('@playwright/test').Page) {
  const bouton = page.getByRole('button', {
    name: /ouvrir le menu|open menu/i,
  });
  if (await bouton.isVisible()) {
    await bouton.click();
    return page.getByRole('dialog');
  }
  return page.getByRole('complementary');
}

test.describe('Hors ligne @critical', () => {
  test("l'app se relance sans réseau, et le dit", async ({ page, context }) => {
    await page.goto('/');
    await attendreLeServiceWorker(page);

    await context.setOffline(true);
    await page.reload();

    // La coquille est servie par le cache : le titre est là.
    await expect(
      page.getByRole('heading', { name: /miss badminton/i }).first()
    ).toBeVisible();

    // Et l'app annonce l'état plutôt que de le laisser deviner.
    await expect(page.getByRole('status')).toContainText(/hors ligne|offline/i);
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

  test('le menu annonce le hors-ligne, en ligne comme hors ligne', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    await attendreLeServiceWorker(page);

    // EN LIGNE, la promesse est déjà tenue : le worker contrôle la page, donc
    // le menu peut le dire sans mentir — c'est ce que l'app ne disait nulle
    // part, alors qu'elle n'a jamais eu besoin de réseau.
    const menu = await ouvrirLeMenu(page);
    await expect(
      menu.getByText(/prêt hors ligne|ready offline|listo sin conexión/i)
    ).toBeVisible();

    await context.setOffline(true);
    await expect(
      menu.getByText(
        /tout fonctionne quand même|everything still works|todo sigue funcionando/i
      )
    ).toBeVisible();
  });
});
