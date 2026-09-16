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
import { FamilyLinks } from './components/FamilyLinks';
import { HomeView } from './views/HomeView';
import { useI18n } from '../i18n';

// HomeView reste eager : c'est la page d'atterrissage par défaut. Les
// autres vues ne sont chargées qu'au premier accès — gain de bundle initial
// et de temps jusqu'à l'interactivité sur l'accueil.
const MatchView = lazy(() =>
  import('./views/MatchView').then(m => ({ default: m.MatchView }))
);
const HistoryView = lazy(() =>
  import('./views/HistoryView').then(m => ({ default: m.HistoryView }))
);
const SettingsView = lazy(() =>
  import('./views/SettingsView').then(m => ({ default: m.SettingsView }))
);

function DocumentTitle() {
  const location = useLocation();

  /*
   * LA VUE DE PAGE VIT ICI, avec le titre du document : ce composant est déjà
   * celui qui écoute la route et ne rend rien. GA4 n'envoie `page_view` qu'au
   * chargement du document, et `initAnalytics` pose en plus
   * `send_page_view: false` pour que la première vue passe par ce hook comme
   * les autres — sinon l'écran d'entrée serait compté deux fois.
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

function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] items-center justify-center text-sm opacity-60"
    >
      …
    </div>
  );
}

function AppRoutes() {
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
      {/* HORS des routes : le code source et le soutien sont ainsi sur le
          premier écran comme sur les Paramètres — la règle famille. Rendus
          depuis `SettingsView`, ils ne valaient que pour cet écran-là. */}
      {/* Une `region`, pas une boîte modale : elle ne piège pas le focus. Ne
          rend RIEN tant que `VITE_GA_MEASUREMENT_ID` n'est pas posée — sans
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
        gaMeasurementId={import.meta.env.VITE_GA_MEASUREMENT_ID}
        placement="fixed"
        className="mb-consent-banner"
      />
      <FamilyLinks />
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
