import { defineConfig, type PluginOption } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

const analyze = process.env.ANALYZE === '1';

// GitHub Pages : https://mister-guiiug.github.io/miss-badminton/
export default defineConfig(({ command }) => {
  const basePath = command === 'build' ? '/miss-badminton/' : '/';

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
      {
        name: 'miss-badminton-trailing-slash',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
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
          });
        },
      },
      VitePWA({
        registerType: 'prompt',
        includeAssets: [
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/apple-touch-icon.png',
          'robots.txt',
        ],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2,webmanifest}'],
        },
        manifest: {
          id: '/miss-badminton/',
          name: 'Miss Badminton',
          short_name: 'Badminton',
          description:
            'Suivez vos scores et statistiques de badminton en temps réel.',
          theme_color: '#166534',
          background_color: '#f0fdf4',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/miss-badminton/',
          scope: '/miss-badminton/',
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
