/**
 * Métadonnées et types pour les routes de l'application
 */

export type AppRoute = 'home' | 'match' | 'history' | 'settings';

export const ROUTE_META: Record<
  AppRoute,
  { documentTitle: string; breadcrumb: string }
> = {
  home: { documentTitle: 'Miss Badminton', breadcrumb: 'Accueil' },
  match: {
    documentTitle: 'Match en cours — Miss Badminton',
    breadcrumb: 'Match',
  },
  history: {
    documentTitle: 'Historique — Miss Badminton',
    breadcrumb: 'Historique',
  },
  settings: {
    documentTitle: 'Paramètres — Miss Badminton',
    breadcrumb: 'Paramètres',
  },
};
