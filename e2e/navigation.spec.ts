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
    // SUR MOBILE, LE MENU EST FERMÉ. La barre latérale permanente n'existe
    // qu'au-dessus du seuil `md` : sur Pixel 5 et iPhone 12, aucun lien
    // « Historique » n'est dans le document tant que le tiroir n'est pas
    // ouvert, et ce test attendait donc 30 s avant d'échouer — sur deux des
    // cinq navigateurs de la matrice, depuis toujours et sans que personne le
    // voie (la CI de ce dépôt ne joue pas les e2e : `run-e2e: false`).
    const opener = page.getByRole('button', {
      name: /ouvrir le menu|open menu|abrir el menú/i,
    });
    if (await opener.isVisible()) await opener.click();
    await page
      .getByRole('link', { name: /historique|history/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/historique/);
  });
});

/**
 * Le pied de page est rendu par la COQUILLE, hors des routes : ce qu'il porte
 * est visible sur tous les écrans. C'est pour ça que ce test vit ici et pas
 * dans le spec d'un écran.
 */
test.describe('Signaler un problème @smoke', () => {
  test('le pied de page porte le lien vers le gabarit d’anomalie', async ({
    page,
  }) => {
    await page.goto('/');
    const link = page.getByRole('link', {
      name: /signaler un problème/i,
    });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      'href',
      /github\.com\/mister-guiiug\/miss-badminton\/issues\/new\?template=bug\.yml/
    );
  });
});
