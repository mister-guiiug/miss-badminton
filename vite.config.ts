import {
  defineConfig,
  type Connect,
  type PluginOption,
  type ViteDevServer,
} from 'vite';
import type { ServerResponse } from 'node:http';
import { VitePWA } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { pwaSeoPlugin } from '@mister-guiiug/dev-pwa-config/vite-pwa-base';
import { cspPlugin } from '@mister-guiiug/dev-pwa-config/vite-csp';
import { visualizer } from 'rollup-plugin-visualizer';
import { versionPlugin } from '@mister-guiiug/dev-pwa-config/vite-version';

const analyze = process.env.ANALYZE === '1';

// GitHub Pages : https://mister-guiiug.github.io/miss-badminton/
// `VITE_BASE_PATH` permet d'override (ex. Lighthouse CI sert le dist/ à
// la racine, donc on lui passe `/` au build). Sans la variable, on garde
// le défaut historique `/miss-badminton/` au build et `/` en dev.
export default defineConfig(({ command }) => {
  const envBase = process.env.VITE_BASE_PATH;
  const basePath = envBase ?? (command === 'build' ? '/miss-badminton/' : '/');

  return {
    base: basePath,
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            const norm = id.replace(/\\/g, '/');
            // Sentry est chargé par un `import()` que `loader` rend
            // analysable. Sans cette ligne il tomberait dans `vendor`,
            // qui est PRÉCHARGÉ : mesuré sur miss-uwh, 381,9 kB
            // préchargés au lieu de 227,2 — pour un total gzip identique
            // à 0,1 kB près. Le total ne voit pas la différence,
            // `bundleBudget.preloadGzipKb` si.
            if (norm.includes('/@sentry/')) return 'sentry';
            // ET POSTHOG POUR LA MÊME RAISON, EN PLUS GRAVE. Sentry préchargé
            // coûtait du poids ; PostHog préchargé casse une PROMESSE : l'ADR
            // 0012 dit que rien n'est chargé avant l'accord, et le socle ne
            // l'appelle qu'après. Sans cette ligne, la bibliothèque tombe
            // dans `vendor`, qui est PRÉCHARGÉ — elle serait donc
            // téléchargée chez un visiteur qui refuse. C'est `preloadGzipKb`
            // qui le voit, jamais le total.
            if (norm.includes('/posthog-js/')) return 'posthog';
            if (
              norm.includes('/vite-plugin-pwa/') ||
              norm.includes('/workbox-')
            ) {
              return 'pwa';
            }
            if (
              norm.includes('/react-dom/') ||
              norm.includes('/node_modules/react/') ||
              norm.includes('/scheduler/')
            ) {
              return 'react-vendor';
            }
            if (norm.includes('/react-router/')) return 'router';
            if (norm.includes('/zustand/')) return 'zustand';
            if (
              norm.includes('/tailwindcss/') ||
              norm.includes('/@tailwindcss/')
            ) {
              return 'tailwind';
            }
            return 'vendor';
          },
        },
      },
    },
    plugins: [
      // AVANT cspPlugin : il pose un script inline dans le <head>, que la
      // CSP doit hacher après coup ; et il écrit version.json au build.
      versionPlugin({ manifest: true }),
      react(),
      tailwindcss(),
      // SEO partagé famille : canonical/OG via placeholders index.html +
      // sitemap.xml/robots.txt générés au build (source unique).
      pwaSeoPlugin({
        siteName: 'Miss Badminton',
        basePath,
        logoPath: '/logo.svg',
        // Script anti-FOUC engendré par le socle (theme-boot), injecté en tête
        // de <head>. Il interroge `(prefers-color-scheme: dark)` — l'ancienne
        // IIFE maison interrogeait `light` avec repli sombre, donc tout
        // navigateur incapable d'évaluer la media query démarrait en sombre.
        // `legacyKeys` migre la préférence déjà stockée sous `mb_theme` vers
        // la clé famille `dwc_theme`, partagée avec ThemeProvider/useTheme.
        themeBoot: { legacyKeys: ['mb_theme'] },
        // Deux <meta name="theme-color"> par schéma (attribut media) : la
        // barre du navigateur suit le système dès le premier rendu ; le choix
        // explicite contraire au système est couvert par ThemeProvider.
        themeColor: { light: '#4f46e5', dark: '#0f172a' },
      }),
      // CSP durcie : script-src par hash SHA-256 des scripts inline (plus de
      // 'unsafe-inline' en prod). Placé après pwaSeoPlugin pour hasher le
      // script anti-FOUC injecté par themeBoot. Directives portées à
      // l'identique depuis l'ancienne meta statique de index.html.
      cspPlugin({
        dev: command === 'serve',
        // Ouvre les hôtes de PostHog — le nuage EUROPÉEN (ADR 0012). Sans
        // cette option, l'ingestion que `ConsentBanner` déclenche APRÈS
        // l'accord serait refusée par la politique — et l'échec ne se verrait
        // qu'en console, sur le site déployé, une fois le consentement donné.
        analytics: true,
        extraDirectives: {
          'frame-ancestors': "'none'",
        },
      }),
      {
        name: 'miss-badminton-trailing-slash',
        configureServer(server: ViteDevServer) {
          server.middlewares.use(
            (
              req: Connect.IncomingMessage,
              res: ServerResponse,
              next: Connect.NextFunction
            ) => {
              const raw = req.originalUrl ?? '';
              const pathOnly = raw.split('?')[0] ?? '';
              if (pathOnly === '/miss-badminton') {
                const qs = raw.includes('?') ? `?${raw.split('?')[1]}` : '';
                res.statusCode = 302;
                res.setHeader('Location', `/miss-badminton/${qs}`);
                res.end();
                return;
              }
              next();
            }
          );
        },
      },
      VitePWA({
        registerType: 'prompt',
        includeAssets: [
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/icon-maskable-512.png',
          'icons/apple-touch-icon.png',
        ],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2,webmanifest}'],
          /*
           * LE MORCEAU SENTRY HORS DU PRÉCACHE, sans quoi le découpage
           * ci-dessus ne servirait à rien : `globPatterns` ramasse TOUT le
           * JS émis, `import()` ou pas. Mesuré le 16/09/2026 sur la
           * production de deux apps du parc, 345 et 463 KiB bruts de SDK
           * téléchargés par chaque visiteur — sans qu’aucun DSN soit posé.
           *
           * Hors précache, il est cherché sur le réseau à la première
           * erreur, et jamais si l’observabilité reste éteinte. Ne pas
           * l’avoir hors ligne est sans conséquence : rapporter une erreur
           * demande le réseau.
           */
          globIgnores: ['**/sentry-*.js'],
        },
        manifest: {
          // Les paths absolus du manifest doivent matcher la base
          // effective (sinon le navigateur 404 sur l'installation PWA).
          id: basePath,
          name: 'Miss Badminton',
          short_name: 'Miss Badminton',
          description: 'Suivi simplifié de scores de badminton et plus encore',
          theme_color: '#4f46e5',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: basePath,
          scope: basePath,
          lang: 'fr',
          // DEUX RÔLES, DEUX IMAGES. `any` reçoit la marque telle quelle,
          // coins arrondis compris ; `maskable` reçoit une version réduite
          // sur fond plein bord à bord, parce qu'Android applique son propre
          // masque et ne garantit que les 80 % centraux. Les déclarer sur le
          // MÊME fichier — ce que faisait ce manifeste — donne une icône
          // installée aux coins coupés et au dessin rogné.
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: 'screenshots/mobile.png',
              sizes: '824x1830',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Écran d’accueil sur mobile',
            },
            {
              src: 'screenshots/wide.png',
              sizes: '2560x1600',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Écran d’accueil sur ordinateur',
            },
          ],
        },
      }),
      analyze &&
        (visualizer({
          open: true,
          filename: 'dist/stats.html',
          gzipSize: true,
          brotliSize: true,
        }) as PluginOption),
    ].filter(Boolean),
  };
});
