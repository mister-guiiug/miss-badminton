import { afterEach, describe, expect, it } from 'vitest';
import { buildReplayUrl, buildShareText, readReplayFromUrl } from './share';
import type { MatchConfig } from './react/components/MatchSetupWizard';
import type { SavedMatch } from './storage';

/**
 * `src/share.ts` n'avait aucun test — y compris l'aller-retour du lien
 * « replay », qui encode toute une configuration de match en base64 dans une
 * URL. Ce filet est posé ICI parce que la migration vers `share` du socle
 * remplace le calcul de l'URL de base (`currentAppUrl()` au lieu d'une
 * découpe de `location.pathname`) : sans lui, le remplacement serait un pari.
 */

const CONFIG: MatchConfig = {
  type: 'doubles',
  sets: 3,
  points: 21,
  cap: 30,
  sideChange: 'decisive',
  // Accents et espace : c'est ce qui casse `btoa` sans passage par UTF-8.
  team1: { primary: 'Amélie', partner: 'Renée', id: 'A' },
  team2: { primary: 'Bo', partner: 'Zoë', id: 'B' },
};

const originalHref = window.location.href;

function goTo(href: string) {
  window.history.replaceState(null, '', href);
}

afterEach(() => {
  goTo(originalHref);
});

describe('buildShareText', () => {
  it('assemble le score set par set dans le gabarit fourni', () => {
    const match = {
      setScores: [
        { team1: 21, team2: 18 },
        { team1: 19, team2: 21 },
        { team1: 21, team2: 15 },
      ],
      finalSetWins: { team1: 2, team2: 1 },
    } as SavedMatch;

    const text = buildShareText(match, {
      team1: 'Amélie',
      team2: 'Bo',
      template: p => `${p.a} ${p.sa} – ${p.sb} ${p.b} (${p.sets})`,
    });

    expect(text).toBe('Amélie 2 – 1 Bo (21-18, 19-21, 21-15)');
  });
});

describe('lien « replay »', () => {
  it('fait l’aller-retour sans perdre les accents', () => {
    goTo(buildReplayUrl(CONFIG));

    expect(readReplayFromUrl()).toEqual(CONFIG);
  });

  it('pointe la racine du déploiement, quelle que soit la route ouverte', () => {
    // Deux niveaux : c'est là que l'ancienne découpe de `location.pathname`
    // divergeait de `BASE_URL` (elle rendait `/a/`). Les routes de l'app n'en
    // comptent qu'un aujourd'hui, où les deux calculs tombaient d'accord — la
    // propriété, elle, ne dépend pas de la forme des routes.
    goTo('/a/b');

    const url = new URL(buildReplayUrl(CONFIG));

    // `BASE_URL` vaut `/` sous Vitest.
    expect(url.pathname).toBe('/');
  });

  it('ne rend rien quand l’URL ne porte aucune configuration', () => {
    goTo('/');

    expect(readReplayFromUrl()).toBeNull();
  });

  it('ne rend rien plutôt que de lever sur une charge illisible', () => {
    goTo('/?replay=pas-du-base64-valide');

    expect(readReplayFromUrl()).toBeNull();
  });
});
