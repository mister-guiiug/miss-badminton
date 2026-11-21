import { CalendarIcon, HistoryIcon, HomeIcon, SettingsIcon } from '../icons';

/**
 * LES DESTINATIONS, ÉCRITES UNE FOIS.
 *
 * Le tiroir et la barre latérale portaient chacun sa copie de cette liste :
 * deux fichiers à modifier pour une route de plus, et rien pour rappeler le
 * second. Un menu qui diverge de l'autre est un menu qu'on ne peut plus
 * corriger d'un seul geste.
 */
export const NAV_ITEMS = [
  { to: '/', end: true, key: 'nav.home' as const, Icon: HomeIcon },
  {
    to: '/historique',
    end: false,
    key: 'nav.history' as const,
    Icon: HistoryIcon,
  },
  {
    to: '/tournois',
    end: false,
    key: 'nav.ebad' as const,
    Icon: CalendarIcon,
  },
  {
    to: '/parametres',
    end: false,
    key: 'nav.settings' as const,
    Icon: SettingsIcon,
  },
];
