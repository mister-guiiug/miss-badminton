import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { HomeView } from './views/HomeView';
import { MatchView } from './views/MatchView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { useI18n } from '../i18n/useI18n';

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

function AppRoutes() {
  return (
    <Shell>
      <DocumentTitle />
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
