import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '../i18n';
import { HomeView } from './views/HomeView';
import { SettingsView } from './views/SettingsView';
import { App } from './AppRouter';
import { useMatchStore } from '../store/useMatchStore';

/**
 * LA RÈGLE FAMILLE TIENT SUR DEUX ÉCRANS, ET CES DEUX-LÀ.
 *
 * « Code source », « M'offrir un café » et « Signaler un problème » étaient
 * rendus par la COQUILLE, hors des routes — donc sur TOUS les écrans, l'écran
 * de match compris : trois liens sortants au bas d'un tableau de score, en
 * pleine partie. Signalé le 20/09/2026, et `pwa-doctor` le tenait déjà pour
 * une dette : « deux écrans au plus, jamais dans la coquille ».
 *
 * Ces tests tiennent les deux moitiés de la règle — ils sont là, et ils ne
 * sont QUE là. Retirer le lien d'un des deux écrans est un écart aussi net que
 * le remettre dans la coquille, et aucun des deux ne casserait quoi que ce
 * soit sans ce fichier.
 */
const NOMS = [/code source/i, /offrir un café/i, /signaler un problème/i];

function monter(ui: React.ReactElement, entree = '/') {
  render(
    <MemoryRouter initialEntries={[entree]}>
      <I18nProvider>{ui}</I18nProvider>
    </MemoryRouter>
  );
}

/** Les trois liens, par leur nom accessible. */
const liens = () =>
  NOMS.map(nom => screen.queryAllByRole('link', { name: nom }).length);

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('les liens de la règle famille', () => {
  it("sont sur l'accueil", () => {
    monter(<HomeView />);
    expect(liens()).toEqual([1, 1, 1]);
  });

  it('sont sur les Paramètres', () => {
    monter(<SettingsView />);
    expect(liens()).toEqual([1, 1, 1]);
  });

  it("ne sont PAS sur l'écran de match — c'est le défaut signalé", async () => {
    // LE CŒUR DE LA DEMANDE. On monte l'application ENTIÈRE, coquille
    // comprise, sur `/match` : c'est la seule façon de prouver que la coquille
    // ne les rend plus. Un match doit être posé, sans quoi `MatchView`
    // renvoie aussitôt vers l'accueil et le test lirait le mauvais écran.
    useMatchStore.setState({
      match: {
        type: 'singles',
        sets: 2,
        points: 21,
        cap: null,
        sideChange: 'each-set',
        team1: { primary: 'A', id: 'A' },
        team2: { primary: 'B', id: 'B' },
      },
    });
    window.history.pushState({}, '', '/match');

    render(
      <I18nProvider>
        <App />
      </I18nProvider>
    );

    // `MatchView` est chargée à la demande : on attend qu'elle soit là avant
    // de conclure à une absence, sinon on prouverait seulement qu'un écran
    // vide ne porte pas de liens. On l'ancre sur le pied du tableau de score,
    // qui n'existe que là — `role="status"` ne ferait pas l'affaire, l'écran
    // en porte plusieurs.
    await waitFor(() =>
      expect(document.querySelector('.mb-scoreboard-footer')).not.toBeNull()
    );
    expect(window.location.pathname).toBe('/match');
    expect(liens()).toEqual([0, 0, 0]);
  });

  it("n'en pose qu'UN exemplaire sur l'accueil, pas deux", async () => {
    // La garde de la migration : si la coquille les rendait ENCORE en plus de
    // l'écran, l'accueil en afficherait deux de chaque — et rien d'autre ne
    // le dirait.
    window.history.pushState({}, '', '/');
    render(
      <I18nProvider>
        <App />
      </I18nProvider>
    );

    expect(
      await screen.findByRole('link', { name: /code source/i })
    ).toBeTruthy();
    expect(liens()).toEqual([1, 1, 1]);
  });
});
