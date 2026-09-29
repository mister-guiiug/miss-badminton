import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nProvider, LOCALE_STORAGE_KEY } from '../../i18n';
import { MatchSetupWizard, type MatchConfig } from './MatchSetupWizard';
import { must } from '../../test/must';

/**
 * L'ASSISTANT ÉCRIT LE FORMAT. Le moteur joue le 3 × 15 et le 21 points
 * (`scoring.test.ts`, `useMatchStore.test.ts`) ; encore faut-il que ce soit
 * ce que l'assistant enregistre, et qu'un match d'avant, rejoué, garde les
 * règles avec lesquelles il a été joué.
 */

function ouvrir(initial?: MatchConfig) {
  const onComplete = vi.fn<(config: MatchConfig) => void>();
  render(
    <I18nProvider>
      <MatchSetupWizard
        initial={initial}
        onCancel={() => {}}
        onComplete={onComplete}
      />
    </I18nProvider>
  );
  return onComplete;
}

/** Démarre le match et rend la configuration transmise. */
function demarrer(onComplete: ReturnType<typeof ouvrir>): MatchConfig {
  fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
  expect(onComplete).toHaveBeenCalledTimes(1);
  return must(onComplete.mock.calls[0]?.[0], 'la configuration du match');
}

function suivant() {
  fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
}

function groupe(nom: string) {
  return screen.getByRole('radiogroup', { name: nom });
}

function choisir(nomGroupe: string, option: string) {
  fireEvent.click(
    within(groupe(nomGroupe)).getByRole('radio', { name: option })
  );
}

/** Le libellé de l'option cochée dans un groupe. */
function coche(nomGroupe: string): string | null {
  const radio = within(groupe(nomGroupe))
    .getAllByRole('radio')
    .find(r => r.getAttribute('aria-checked') === 'true');
  return radio?.textContent ?? null;
}

/** Un match enregistré avant le format de 2026 : ni écart ni point. */
function matchDAvant(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    type: 'singles',
    sets: 2,
    points: 21,
    cap: null,
    sideChange: 'each-set',
    team1: { primary: 'Léa', id: 'A' },
    team2: { primary: 'Tom', id: 'B' },
    ...overrides,
  };
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  localStorage.setItem(LOCALE_STORAGE_KEY, 'fr');
});

describe('les deux formats nommés', () => {
  it('« Match standard » lance le 3 × 15', () => {
    const onComplete = ouvrir();
    const bouton = screen.getByRole('button', { name: /Match standard/ });
    expect(bouton.textContent).toContain('15 pts · plafond 21');
    fireEvent.click(bouton);
    expect(demarrer(onComplete)).toMatchObject({
      type: 'singles',
      sets: 2,
      points: 15,
      winBy: 2,
      cap: 21,
      sideChange: 'each-set',
      sideChangeAt: 8,
    });
  });

  it('« Format 21 points » garde l’ancien standard en alternative', () => {
    const onComplete = ouvrir();
    const bouton = screen.getByRole('button', { name: /Format 21 points/ });
    expect(bouton.textContent).toContain('21 pts · plafond 30');
    fireEvent.click(bouton);
    expect(demarrer(onComplete)).toMatchObject({
      sets: 2,
      points: 21,
      winBy: 2,
      cap: 30,
      sideChange: 'each-set',
      sideChangeAt: 11,
    });
  });
});

describe('les règles sur mesure', () => {
  function versLesRegles() {
    fireEvent.click(screen.getByRole('button', { name: /^Seul/ }));
    suivant();
  }

  it('partent du 3 × 15', () => {
    const onComplete = ouvrir();
    versLesRegles();
    expect(coche('Points par set')).toBe('15');
    expect(coche('Écart')).toBe('2');
    expect(coche('Plafond')).toBe('21');
    expect(coche('Changement de côté')).toBe('Règle officielle');
    expect(coche('Point du changement')).toBe('8');
    suivant();
    expect(demarrer(onComplete)).toMatchObject({
      points: 15,
      winBy: 2,
      cap: 21,
      sideChange: 'each-set',
      sideChangeAt: 8,
    });
  });

  it('21 points emmène le plafond à 30 et le changement à 11, 15 les ramène', () => {
    ouvrir();
    versLesRegles();
    choisir('Points par set', '21');
    expect(coche('Plafond')).toBe('30');
    expect(coche('Point du changement')).toBe('11');
    // Un plafond à 21 couperait un set de 21 points : il n'est plus proposé.
    expect(
      within(groupe('Plafond')).queryByRole('radio', { name: '21' })
    ).toBeNull();

    choisir('Points par set', '15');
    expect(coche('Plafond')).toBe('21');
    expect(coche('Point du changement')).toBe('8');
  });

  it('chaque règle reste modifiable après le choix du format', () => {
    const onComplete = ouvrir();
    versLesRegles();
    choisir('Écart', '1');
    choisir('Plafond', 'Sans');
    choisir('Changement de côté', 'En cours de set');
    choisir('Point du changement', '11');
    suivant();
    expect(demarrer(onComplete)).toMatchObject({
      points: 15,
      winBy: 1,
      cap: null,
      sideChange: 'mid-match',
      sideChangeAt: 11,
    });
  });

  it('« Entre les sets » n’enregistre pas de point : pas de rappel en cours de set', () => {
    const onComplete = ouvrir();
    versLesRegles();
    choisir('Changement de côté', 'Entre les sets');
    expect(
      screen.queryByRole('radiogroup', { name: 'Point du changement' })
    ).toBeNull();
    suivant();
    const config = demarrer(onComplete);
    expect(config.sideChange).toBe('each-set');
    expect(config.sideChangeAt).toBeUndefined();
  });
});

describe('un match d’avant, rejoué', () => {
  it('« Mi-match (à 11) » garde son changement à 11', () => {
    const onComplete = ouvrir(
      matchDAvant({ points: 15, sideChange: 'mid-match' })
    );
    suivant();
    expect(coche('Changement de côté')).toBe('En cours de set');
    expect(coche('Point du changement')).toBe('11');
    suivant();
    expect(demarrer(onComplete)).toMatchObject({
      points: 15,
      winBy: 2,
      sideChange: 'mid-match',
      sideChangeAt: 11,
    });
  });

  it('« Chaque set » reste entre les sets, sans rappel en cours de set', () => {
    const onComplete = ouvrir(matchDAvant());
    suivant();
    expect(coche('Changement de côté')).toBe('Entre les sets');
    expect(coche('Plafond')).toBe('Sans');
    suivant();
    const config = demarrer(onComplete);
    expect(config).toMatchObject({
      points: 21,
      winBy: 2,
      cap: null,
      sideChange: 'each-set',
    });
    expect(config.sideChangeAt).toBeUndefined();
  });
});
