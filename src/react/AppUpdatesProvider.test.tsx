import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

// INDISPENSABLE, et c'est un piège du socle lui-même. `vitest-setup` pose un
// `vi.mock('virtual:pwa-register')` MUET pour toutes les suites. Or le
// `resolve.alias` de `vitest.config.ts` fait pointer ce spécificateur vers
// `testing/pwa-register` : le mock est donc enregistré sur le FICHIER du double
// du socle, et l'importer par son chemin de paquet rend le mock muet, pas le
// double. Sans cette ligne : « No "swStub" export is defined on the
// "virtual:pwa-register" mock ».
vi.unmock('virtual:pwa-register');

import {
  registerSW as pilotableRegisterSW,
  swStub,
} from '@mister-guiiug/dev-pwa-config/testing/pwa-register';
import { LABELS } from '@mister-guiiug/dev-pwa-config/react/labels';
import { I18nProvider } from '../i18n';
import { useI18n } from '../i18n';
import { messages } from '../i18n/messages';
import { AppUpdatesProvider } from './AppUpdatesProvider';

/**
 * Ce que ces tests garantissent, et qu'aucun autre ne garantissait.
 *
 * 1. **Le bandeau peut S'AFFICHER.** Le double du socle LÈVE si personne n'a
 *    injecté `registerSW` : un bandeau monté mais structurellement incapable
 *    d'apparaître — le défaut vécu des mois par une app de la famille — fait
 *    donc échouer le test au lieu de passer en silence.
 *
 * 2. **Le bandeau parle la BONNE LANGUE.** `react/labels` du socle ne livre
 *    que `fr` et `en`, et fait retomber toute locale inconnue sur le français
 *    SANS RIEN SIGNALER. Miss Badminton parle aussi espagnol : sans les
 *    surcharges d'`AppUpdatesProvider`, un utilisateur en `es` verrait un
 *    bandeau français, et ni le typage, ni ESLint, ni aucun test ne le dirait.
 *
 * Voir le `vi.unmock` ci-dessus pour le détour imposé par le `vitest-setup` du
 * socle.
 */

/** `LABELS` est un `Record<string, …>` : TS ignore quelles locales existent. */
function socleLabels(locale: string) {
  const group = LABELS[locale];
  if (!group) throw new Error(`LABELS.${locale} manquant`);
  return group;
}

/** Rend la locale courante pilotable depuis le test. */
function LocaleProbe() {
  const { locale, setLocale } = useI18n();
  return (
    <button type="button" data-testid="to-es" onClick={() => setLocale('es')}>
      {locale}
    </button>
  );
}

function mount(registerSW?: typeof pilotableRegisterSW) {
  return render(
    <I18nProvider>
      <AppUpdatesProvider registerSW={registerSW}>
        <LocaleProbe />
      </AppUpdatesProvider>
    </I18nProvider>
  );
}

describe('AppUpdatesProvider', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    // Locale de départ DÉTERMINISTE : sans elle, `detectInitialLocale()` suit
    // `navigator.language`, que jsdom fixe à `en-US`.
    localStorage.setItem('mb_locale', 'fr');
    // Identité NEUVE pour `registerSW` : `useUpdatePrompt` mémorise sa
    // connexion par identité de fonction, le report d'un test survivrait sinon.
    swStub.reset();
  });

  it('le socle livre les sept langues depuis 3.33.0 — le piège que ces tests fermaient', () => {
    // Jusqu'à 3.32, `react/labels` ne portait que fr et en, et résolvait par
    // `LABELS[locale] ?? LABELS.fr` : les cinq autres langues retombaient en
    // français sans un mot. Ces tests figeaient ce piège ; ils figent
    // désormais sa disparition — mais la règle qu'ils ont inspirée reste
    // bonne, l'app passe ses propres libellés au bandeau.
    expect(Object.keys(LABELS).sort()).toEqual([
      'de',
      'en',
      'es',
      'fr',
      'it',
      'nl',
      'pt',
    ]);
    expect(LABELS.es).toBeDefined();
  });

  it('affiche le bandeau quand une nouvelle version attend, en français par défaut', () => {
    mount(pilotableRegisterSW);

    // Personne n'a encore rien vu : le bandeau n'apparaît qu'à l'évènement.
    expect(screen.queryByText(messages.fr.update.available)).toBeNull();

    // Preuve que `registerSW` a bien été injecté : sans lui, `needRefresh()`
    // lèverait au lieu de déclencher quoi que ce soit.
    expect(swStub.registered).toBe(true);
    act(() => {
      swStub.needRefresh();
    });

    expect(screen.getByText(messages.fr.update.available)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: messages.fr.update.action })
    ).toBeInTheDocument();
  });

  it("affiche l'ESPAGNOL — locale que le socle ne connaît pas — et non son repli français", () => {
    mount(pilotableRegisterSW);
    act(() => {
      swStub.needRefresh();
    });

    fireEvent.click(screen.getByTestId('to-es'));

    // Le libellé vient de `messages.es`, pas du dictionnaire du socle.
    expect(screen.getByText(messages.es.update.available)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: messages.es.update.action })
    ).toBeInTheDocument();

    // Et surtout : PLUS AUCUN français à l'écran. C'est exactement ce que
    // `LabelsProvider` afficherait sans surcharges, et personne ne le verrait.
    expect(screen.queryByText(messages.fr.update.available)).toBeNull();
    expect(screen.queryByText(socleLabels('fr').update.title)).toBeNull();
    expect(
      screen.queryByRole('button', { name: socleLabels('fr').update.update })
    ).toBeNull();
  });

  it('sans registerSW (le cas du développement), aucun worker n’est enregistré', () => {
    mount(undefined);

    expect(swStub.registered).toBe(false);
    // Le double dit lui-même pourquoi le bandeau ne peut pas apparaître.
    expect(() => {
      swStub.needRefresh();
    }).toThrow(/registerSW n'a jamais été appelé/);
    expect(screen.queryByText(messages.fr.update.available)).toBeNull();
  });
});
