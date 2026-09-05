import './tailwind.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ErrorBoundary,
  ThemeProvider,
} from '@mister-guiiug/dev-pwa-config/react';
import {
  installErrorReporter,
  initSentry,
  recordError,
} from '@mister-guiiug/dev-pwa-config/react/observability';
import { unregisterServiceWorkers } from '@mister-guiiug/dev-pwa-config/sw-update';
import { registerSW } from 'virtual:pwa-register';
import { App } from './react/AppRouter';
import { AppUpdatesProvider } from './react/AppUpdatesProvider';
import { I18nProvider } from './i18n';

installErrorReporter();
void initSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});

// PURGE DE DÉVELOPPEMENT. Un service worker resté d'une session précédente sert
// du cache périmé pendant qu'on code, et se bat contre le HMR. Le socle fournit
// la désinscription (`unregisterServiceWorkers`), mais la CONDITION reste ici :
// ce paquet est aussi lu par `node --test`, qui n'a pas `import.meta.env`.
if (import.meta.env.DEV) {
  void unregisterServiceWorkers();
}

const rootElement = document.querySelector<HTMLDivElement>('#app');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <ErrorBoundary
        onError={error => {
          recordError(error, { source: 'error-boundary' });
        }}
      >
        {/* Avant React, le thème est posé par le script anti-FOUC injecté
            au build (pwaSeoPlugin themeBoot) ; ThemeProvider prend ensuite
            le relais : état partagé, écoute du thème système, et balise
            <meta name="theme-color"> alignée sur le schéma affiché. Pas
            d'appId : aucune palette --dwc-* n'est peinte, styles.css garde
            la main. */}
        <ThemeProvider
          legacyKeys={['mb_theme']}
          themeColor={{ light: '#4f46e5', dark: '#0f172a' }}
        >
          <I18nProvider>
            {/* En développement, `registerSW` vaut `undefined` : le hook du
                socle sort de son effet, aucun worker n'est enregistré, et le
                bandeau ne peut pas apparaître. C'est le versant « ne pas
                enregistrer en dev » de la purge ci-dessus. */}
            <AppUpdatesProvider
              registerSW={import.meta.env.PROD ? registerSW : undefined}
            >
              <App />
            </AppUpdatesProvider>
          </I18nProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
