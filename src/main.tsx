import './tailwind.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ErrorBoundary,
  ThemeProvider,
} from '@mister-guiiug/dev-wpa-config/react';
import {
  installErrorReporter,
  initSentry,
  recordError,
} from '@mister-guiiug/dev-wpa-config/react/observability';
import { registerServiceWorker } from './register-sw';
import { App } from './react/AppRouter';
import { I18nProvider } from './i18n/I18nProvider';

installErrorReporter();
void initSentry({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
registerServiceWorker();

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
            <App />
          </I18nProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
