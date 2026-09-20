import { lazy, Suspense, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { ConsentBanner } from '@mister-guiiug/dev-pwa-config/react/consent-banner';
import { usePageViews } from '@mister-guiiug/dev-pwa-config/react/use-page-views';
import { useIdlePrefetch } from '@mister-guiiug/dev-pwa-config/react/use-prefetch';
import { HomeView } from './views/HomeView';
import { useI18n } from '../i18n';

// HomeView reste eager : c'est la page d'atterrissage par défaut. Les
// autres vues ne sont chargées qu'au premier accès — gain de bundle initial
// et de temps jusqu'à l'interactivité sur l'accueil.
//
// CHAQUE IMPORT EST NOMMÉ, parce qu'il sert DEUX FOIS : à `lazy` ci-dessous,
// et au préchargement à l'inactivité de `chargeLesVues`. Deux `import()`
// du même spécificateur ne téléchargent qu'une fois — le registre de modules
// dédoublonne — mais il faut que ce soit LITTÉRALEMENT le même spécificateur,
// sinon le bundler émet deux morceaux et le préchargement ne sert plus à rien.
const chargeMatch = () => import('./views/MatchView');
const chargeHistory = () => import('./views/HistoryView');
const chargeSettings = () => import('./views/SettingsView');
const CHARGEURS = [chargeMatch, chargeHistory, chargeSettings];

const MatchView = lazy(() =>
  chargeMatch().then(m => ({ default: m.MatchView }))
);
const HistoryView = lazy(() =>
  chargeHistory().then(m => ({ default: m.HistoryView }))
);
const SettingsView = lazy(() =>
  chargeSettings().then(m => ({ default: m.SettingsView }))
);

/**
 * PRÉCHARGE LES TROIS VUES DÈS QUE LE FIL PRINCIPAL SOUFFLE.
 *
 * LE DÉFAUT QUE CECI CORRIGE. Sans préchargement, le morceau d'une vue n'est
 * demandé qu'au CLIC. Relevé le 20/09/2026 sur le site publié : `HistoryView`
 * pèse 5,4 ko transférés — et coûte pourtant 118 ms, parce que ce n'est pas du
 * poids mais un aller-retour réseau complet, payé au pire moment. À la première
 * visite, cette requête part pendant que `vendor` (117 ko) et `react-vendor`
 * (69 ko) finissent d'arriver et que le service worker précharge ses 30
 * entrées : le clic reste sans effet le temps que tout ce monde se démêle.
 *
 * Les trois vues ensemble pèsent ~18 ko compressés. Téléchargées pendant que le
 * visiteur regarde l'accueil, elles ne coûtent rien de perceptible — et elles
 * ne comptent PAS dans `bundleBudget.preloadGzipKb`, qui ne mesure que ce qui
 * est `modulepreload` dans le document.
 *
 * LA MÉCANIQUE EST AU SOCLE (`prefetch.js`, par `useIdlePrefetch`) :
 * `requestIdleCallback` et son repli minuté pour Safari, les rejets avalés, et
 * la garde `shouldPrefetch()` — `saveData` ET les connexions 2g, là où la copie
 * locale ne lisait que `saveData`. Quand elle coupe, c'est le menu qui sait
 * dire qu'il charge.
 *
 * UNE CONSTANTE DE MODULE, PAS UNE FONCTION EN LIGNE : le socle ne lance un
 * chargeur qu'UNE fois et le reconnaît à son IDENTITÉ. Écrit dans le
 * composant, `() => …` changerait d'identité à chaque montage et relancerait
 * tout. `allSettled` : un morceau qui manque ne prive pas les deux autres — au
 * clic, `lazy` redemandera le sien et c'est LUI qui portera l'erreur, dans son
 * propre `Suspense`.
 */
const chargeLesVues = () =>
  Promise.allSettled(CHARGEURS.map(charge => charge()));

function DocumentTitle() {
  const location = useLocation();

  /*
   * LA VUE DE PAGE VIT ICI, avec le titre du document : ce composant est déjà
   * celui qui écoute la route et ne rend rien. `initAnalytics` pose
   * `capture_pageview: false` pour que la première vue passe par ce hook comme
   * les autres : laissé à lui-même, PostHog en envoie une au chargement ET à
   * chaque changement d'historique, et l'écran d'entrée serait compté deux
   * fois.
   *
   * Ne fait rien tant que le consentement n'est pas accordé.
   */
  usePageViews(location.pathname);
  const { t, locale } = useI18n();

  useEffect(() => {
    const routeMap: Record<string, 'home' | 'match' | 'history' | 'settings'> =
      {
        '/': 'home',
        '/match': 'match',
        '/historique': 'history',
        '/parametres': 'settings',
      };
    const route = routeMap[location.pathname] ?? 'home';
    document.title = t(`documentTitle.${route}`);
  }, [location.pathname, t, locale]);

  return null;
}

/**
 * CE REPLI NE SE VOIT QUE SUR UN ATTERRISSAGE DIRECT, et il faut le savoir
 * avant d'essayer de l'améliorer : react-router 7 enveloppe tout changement
 * d'URL dans `startTransition`, et React 19 garde délibérément l'écran déjà
 * affiché plutôt que de le remplacer par un repli. Sur un CLIC dans
 * l'application, il ne paraît donc jamais — mesuré le 20/09/2026, 4 s
 * d'échantillonnage toutes les 16 ms, zéro apparition. C'est le menu qui dit
 * qu'il charge ; ici, on ne couvre que l'arrivée de plain-pied sur `/historique`
 * ou `/parametres`, où rien n'est encore à l'écran.
 */
function RouteFallback() {
  const { t } = useI18n();
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center text-sm opacity-60"
    >
      {t('nav.loading')}
    </div>
  );
}

function AppRoutes() {
  useIdlePrefetch(chargeLesVues);
  return (
    <Shell>
      <DocumentTitle />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/match" element={<MatchView />} />
          <Route path="/historique" element={<HistoryView />} />
          <Route
            path="/history"
            element={<Navigate to="/historique" replace />}
          />
          <Route path="/parametres" element={<SettingsView />} />
          <Route
            path="/settings"
            element={<Navigate to="/parametres" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {/* LES LIENS DE LA RÈGLE FAMILLE NE SONT PLUS ICI — voir `FamilyLinks`.
          Rendus par la coquille, hors des routes, ils paraissaient sur TOUS
          les écrans, l'écran de match compris : trois liens sortants au bas
          d'un tableau de score, pendant une partie. Ils vivent désormais sur
          l'accueil et sur les Paramètres, les deux écrans que la règle
          nomme. */}
      {/* Une `region`, pas une boîte modale : elle ne piège pas le focus. Ne
          rend RIEN tant que `VITE_POSTHOG_KEY` n'est pas posée — sans
          identifiant, il n'y a rien à demander.

          AU-DESSUS DE LA MODALE, ET C'EST MESURÉ. `Modal` — dont se sert le
          tutoriel de bienvenue, affiché à la première visite — pose un
          `fixed inset-0 z-50` avec un voile `bg-black/55` qui couvre TOUT
          l'écran. Le bandeau était bien dans le DOM et bien visible, mais
          aucun clic ne l'atteignait : relevé le 16/09/2026 par la garde
          `entree.spec.ts`, `elementFromPoint` au centre du bouton « Accepter »
          rendait le voile. Un visiteur ne pouvait NI accepter NI refuser à
          l'arrivée.

          `placement="fixed"` le sort du flux et `.mb-consent-banner` — dans
          `styles.css`, à côté de la règle jumelle du bandeau de mise à jour —
          le remonte au-dessus, le pose EN HAUT et lui donne un fond opaque.
          Les trois raisons y sont écrites : le voile de la modale, les actions
          de l'assistant ancrées en bas, et un fond à 12 % d'opacité qui
          laissait lire au travers. */}
      <ConsentBanner
        posthogKey={import.meta.env.VITE_POSTHOG_KEY}
        loader={() => import('posthog-js/dist/module.slim.js')}
        placement="fixed"
        className="mb-consent-banner"
      />
    </Shell>
  );
}

export function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
  return (
    <BrowserRouter basename={basename}>
      <AppRoutes />
    </BrowserRouter>
  );
}
