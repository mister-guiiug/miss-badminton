import { lazy, Suspense, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Shell } from './components/layout/Shell';
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
