import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../../../i18n';
import { NavDrawer } from './NavDrawer';
import { PersistentSidebar } from './PersistentSidebar';

/**
 * LA PARITÉ DES DEUX MENUS, tenue par un test plutôt que par la discipline.
 *
 * Le tiroir mobile et la barre latérale de bureau portaient chacun sa copie de
 * la liste des routes, et le choix de la langue n'existait que dans le tiroir :
 * sur un iPad tourné en paysage, le réglage disparaissait. Les deux rendent
 * désormais le même corps (`MenuContent`) — ce test le vérifie sur ce qu'on
 * voit, pas sur le fait qu'ils importent le même fichier.
 */
function monter(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <I18nProvider>{ui}</I18nProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

describe('les deux menus offrent la même chose', () => {
  it('la barre latérale porte les trois destinations ET le choix de la langue', () => {
    monter(<PersistentSidebar />);
    const menu = screen.getByRole('complementary');
    for (const nom of [
      /accueil|home/i,
      /historique|history/i,
      /paramètres|settings/i,
    ]) {
      expect(within(menu).getByRole('link', { name: nom })).toBeTruthy();
    }
    // Le réglage qui n'existait que sur mobile.
    expect(within(menu).getByRole('button', { name: 'Español' })).toBeTruthy();
  });

  it('le tiroir porte exactement les mêmes', () => {
    monter(<NavDrawer onClose={() => {}} />);
    const tiroir = screen.getByRole('dialog');
    for (const nom of [
      /accueil|home/i,
      /historique|history/i,
      /paramètres|settings/i,
    ]) {
      expect(within(tiroir).getByRole('link', { name: nom })).toBeTruthy();
    }
    expect(
      within(tiroir).getByRole('button', { name: 'Español' })
    ).toBeTruthy();
  });

  it('la destination courante est annoncée, pas seulement colorée', () => {
    // `aria-current` est ce qu'un lecteur d'écran entend ; la couleur, non.
    monter(<PersistentSidebar />);
    const actif = screen.getByRole('link', { current: 'page' });
    expect(actif.getAttribute('href')).toBe('/');
  });

  it('sans service worker, le menu ne promet rien du hors-ligne', () => {
    // C'est le cas du développement : afficher « mise en cache… » y serait un
    // mensonge permanent, puisque aucun worker n'est enregistré.
    monter(<PersistentSidebar />);
    expect(screen.queryByText(/hors ligne|offline|caché|cach/i)).toBeNull();
  });
});
