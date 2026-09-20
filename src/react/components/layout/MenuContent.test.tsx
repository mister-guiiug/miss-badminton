import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lazy, Suspense, type ComponentType } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

  it('le menu ne parle jamais du réseau', () => {
    // L'app n'a pas de serveur : « en ligne / hors ligne » n'y décrit AUCUNE
    // différence de comportement. La ligne d'état a été retirée du menu, et ce
    // test empêche qu'elle y revienne par le corps partagé.
    monter(<PersistentSidebar />);
    expect(
      screen.queryByText(/hors ligne|offline|sin conexión|connect/i)
    ).toBeNull();
  });

  it('le choix de la langue est UN groupe, pas trois pastilles libres', () => {
    // Les ronds bordés flottaient au ras du bord du tiroir, et le premier
    // avait son anneau coupé par l'arête du panneau. Le rail segmenté porte
    // la forme lui-même : ce test tient la structure, pas le pixel.
    monter(<PersistentSidebar />);
    const groupe = screen.getByRole('group', {
      name: /langue|language|idioma/i,
    });
    const choix = within(groupe).getAllByRole('button');
    expect(choix).toHaveLength(3);
    expect(
      choix.filter(c => c.getAttribute('aria-pressed') === 'true')
    ).toHaveLength(1);
  });
});

/**
 * LE DÉFAUT QUE CES TESTS VERROUILLENT : un clic sans aucun effet visible.
 *
 * Signalé le 20/09/2026, à la première visite : « je clique sur historique,
 * rien ne se passe, il faut attendre un peu ». Deux causes, et aucune des deux
 * n'était une lenteur anormale.
 *
 * react-router 7 enveloppe tout changement d'URL dans `startTransition`, et
 * React 19 garde alors délibérément l'écran déjà affiché plutôt que de montrer
 * le repli de `Suspense`. Le repli existait bien, dans `AppRouter` — il n'a
 * simplement jamais pu paraître sur un clic : mesuré sur le site publié, 4 s
 * d'échantillonnage toutes les 16 ms, zéro apparition. Et le menu, lui, se
 * refermait dès le clic, emportant le dernier endroit qui aurait pu dire
 * quelque chose.
 *
 * Ces tests tiennent donc le CONTRAT, pas la mise en forme : tant que la vue
 * n'est pas là, le menu reste ouvert et l'entrée cliquée se dit occupée.
 */
describe('le clic répond avant que la vue soit là', () => {
  /** Monte le tiroir face à une vue dont on décide nous-même de l'arrivée. */
  function monterFaceAUneVueLente() {
    let livre!: () => void;
    const VueLente = lazy(
      () =>
        new Promise<{ default: ComponentType }>(resolve => {
          livre = () =>
            resolve({ default: () => <h1>Historique des matchs</h1> });
        })
    );
    const ferme = vi.fn();

    render(
      <MemoryRouter initialEntries={['/']}>
        <I18nProvider>
          <NavDrawer onClose={ferme} />
          <Suspense fallback={<p>repli</p>}>
            <Routes>
              <Route path="/" element={<p>accueil</p>} />
              <Route path="/historique" element={<VueLente />} />
            </Routes>
          </Suspense>
        </I18nProvider>
      </MemoryRouter>
    );

    const tiroir = screen.getByRole('dialog');
    return {
      ferme,
      lien: within(tiroir).getByRole('link', { name: /historique|history/i }),
      statut: within(tiroir).getByRole('status'),
      /** La vue arrive enfin. */
      livreLaVue: async () => {
        await act(async () => {
          livre();
        });
      },
    };
  }

  it("garde le tiroir ouvert et montre l'entrée occupée, puis ferme à l'arrivée", async () => {
    const { ferme, lien, livreLaVue } = monterFaceAUneVueLente();

    fireEvent.click(lien);

    // LE CŒUR DU DÉFAUT : ici, avant, le tiroir était déjà refermé — sur une
    // page qui n'avait pas changé d'un pixel.
    expect(ferme).not.toHaveBeenCalled();
    expect(lien).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('accueil')).toBeTruthy();

    await livreLaVue();

    expect(
      screen.getByRole('heading', { name: 'Historique des matchs' })
    ).toBeTruthy();
    // Et c'est SEULEMENT maintenant que le menu s'efface.
    expect(ferme).toHaveBeenCalledTimes(1);
    expect(lien).not.toHaveAttribute('aria-busy');
  });

  it('annonce le chargement à qui ne voit pas la pastille tourner', async () => {
    const { lien, statut, livreLaVue } = monterFaceAUneVueLente();

    expect(statut.textContent).toBe('');

    fireEvent.click(lien);
    expect(statut.textContent).toMatch(/chargement|loading|cargando/i);

    await livreLaVue();
    expect(statut.textContent).toBe('');
  });

  it('laisse le navigateur ouvrir un nouvel onglet sur Ctrl+clic', async () => {
    // On intercepte le clic pour piloter la transition ; il ne faut pas pour
    // autant confisquer les gestes du navigateur. Sans cette garde, un
    // Ctrl+clic naviguerait dans l'onglet courant au lieu d'en ouvrir un.
    const { ferme, lien } = monterFaceAUneVueLente();

    // On écoute en fin de propagation pour lire le verdict de nos gestionnaires,
    // puis on coupe la navigation : jsdom ne sait pas changer de document et
    // l'annoncerait par un « Not implemented » au milieu du rapport.
    let defautConfisque: boolean | undefined;
    const garde = (e: Event) => {
      defautConfisque = e.defaultPrevented;
      e.preventDefault();
    };
    document.addEventListener('click', garde);
    fireEvent.click(lien, { ctrlKey: true });
    document.removeEventListener('click', garde);

    expect(defautConfisque).toBe(false);
    expect(lien).not.toHaveAttribute('aria-busy');
    expect(ferme).not.toHaveBeenCalled();
    expect(screen.getByText('accueil')).toBeTruthy();
  });
});
