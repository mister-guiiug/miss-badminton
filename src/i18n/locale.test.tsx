import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider, LOCALE_STORAGE_KEY, useI18n } from './index';

/**
 * L'ESPAGNOL DOIT S'AFFICHER — et c'est ce que la copie locale ne faisait pas.
 *
 * Miss Badminton parle trois langues (`LOCALES = ['fr', 'en', 'es']`), mais
 * l'ancien `detectInitialLocale` n'en relisait que deux :
 *
 *     const stored = localStorage.getItem(LS_KEY);
 *     if (stored === 'fr' || stored === 'en') return stored;   // 'es' refusé
 *     const nav = window.navigator?.language?.slice(0, 2)…;
 *     if (nav === 'en') return 'en';                            // 'es' ignoré
 *     return 'fr';
 *
 * `setLocale('es')` écrivait bien `'es'` dans `mb_locale` — la relecture le
 * jetait. Choisir l'espagnol tenait donc jusqu'au prochain rechargement, après
 * quoi l'application repartait en anglais ou en français selon le navigateur.
 * Aucune erreur, aucune trace : le dictionnaire espagnol, tenu à jour clé par
 * clé et vérifié par `messages.test.ts`, était inatteignable d'une session à
 * l'autre.
 *
 * Le socle compare la valeur stockée à l'ensemble des `locales` déclarées ;
 * ces deux tests le prouvent, et ils échouent sur l'ancienne implémentation.
 */

function Probe() {
  const { locale, t } = useI18n();
  return (
    <>
      <span data-testid="locale">{locale}</span>
      <span data-testid="home">{t('nav.home')}</span>
    </>
  );
}

function mount() {
  return render(
    <I18nProvider>
      <Probe />
    </I18nProvider>
  );
}

/** jsdom annonce `en-US` ; chaque test dit explicitement ce qu'il simule. */
function pretendBrowserLanguage(tag: string) {
  Object.defineProperty(window.navigator, 'language', {
    value: tag,
    configurable: true,
  });
}

beforeEach(() => {
  localStorage.clear();
  pretendBrowserLanguage('en-US');
});

afterEach(cleanup);

describe('la langue au démarrage', () => {
  it('rouvre en espagnol quand l’espagnol a été choisi', () => {
    // Ce que `setLocale('es')` a écrit à la session précédente.
    localStorage.setItem(LOCALE_STORAGE_KEY, 'es');

    mount();

    expect(screen.getByTestId('locale')).toHaveTextContent('es');
    expect(screen.getByTestId('home')).toHaveTextContent('Inicio');
  });

  it('démarre en espagnol sur un navigateur espagnol', () => {
    pretendBrowserLanguage('es-ES');

    mount();

    expect(screen.getByTestId('locale')).toHaveTextContent('es');
    expect(screen.getByTestId('home')).toHaveTextContent('Inicio');
  });

  it('rouvre en anglais quand l’anglais a été choisi', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');

    mount();

    expect(screen.getByTestId('home')).toHaveTextContent('Home');
  });

  it('retombe sur le français pour une langue inconnue', () => {
    pretendBrowserLanguage('de-DE');

    mount();

    expect(screen.getByTestId('locale')).toHaveTextContent('fr');
    expect(screen.getByTestId('home')).toHaveTextContent('Accueil');
  });

  it('ignore une valeur stockée hors du dictionnaire', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'kl');
    pretendBrowserLanguage('es-ES');

    mount();

    expect(screen.getByTestId('locale')).toHaveTextContent('es');
  });
});
