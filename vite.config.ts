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
import { pwaSeoPlugin } from '@mister-guiiug/dev-wpa-config/vite-pwa-base';
import { cspPlugin } from '@mister-guiiug/dev-wpa-config/vite-csp';
import { visualizer } from 'rollup-plugin-visualizer';

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
      react(),
      tailwindcss(),
      // SEO partagé famille : canonical/OG via placeholders index.html +
      // sitemap.xml/robots.txt générés au build (source unique).
      pwaSeoPlugin({
        siteName: 'Miss Badminton',
        basePath,
        logoPath: '/logo.svg',
      }),
      // CSP durcie : script-src par hash SHA-256 de l'IIFE anti-FOUC inline
      // (plus de 'unsafe-inline' en prod). Placé après pwaSeoPlugin pour hasher
      // aussi d'éventuels scripts injectés au build. Directives portées à
      // l'identique depuis l'ancienne meta statique de index.html.
      cspPlugin({
        dev: command === 'serve',
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
          'icons/apple-touch-icon.png',
        ],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2,webmanifest}'],
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
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
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
