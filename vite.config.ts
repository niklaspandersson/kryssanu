import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    solidPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'logo-v2-solid.webp', 'logo-v2.webp'],
      manifest: {
        name: 'Kryssa.nu',
        short_name: 'Kryssa',
        description: 'Social fågelskådning',
        lang: 'sv',
        theme_color: '#2d6a4f',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/summary',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // index.html must stay in the precache: it is the offline app shell, and
        // it is precached together with the hashed assets it references, so the
        // two can never drift apart.
        globPatterns: ['**/*.{html,js,css,webp,png,svg,woff2}'],
        // vite-plugin-pwa defaults this to 'index.html'. Leaving it enabled
        // would answer every navigation from the precache, i.e. serve a stale
        // shell while the network is perfectly fine. Navigations are handled by
        // the network-only route below instead.
        navigateFallback: undefined,
        // Same reason: without this, a navigation to '/' falls back to the
        // precached index.html rather than hitting the network.
        directoryIndex: null,
        navigationPreload: true,
        runtimeCaching: [
          {
            // Navigations always go to the network, so a deploy is picked up on
            // the next page load. Only when the network fails do we fall back to
            // the precached app shell. (No networkTimeoutSeconds here: workbox
            // only accepts it on NetworkFirst, and NetworkFirst would mean
            // serving stale HTML from a runtime cache.)
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkOnly',
            options: {
              plugins: [
                {
                  // The precache stores index.html under a revisioned cache key
                  // (`/index.html?__WB_REVISION__=...`), hence ignoreSearch.
                  handlerDidError: async () =>
                    caches.match('/index.html', { ignoreSearch: true }),
                },
              ],
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // User-uploaded observation images. They are immutable (content-addressed
            // by id), so cache them so once-viewed photos render offline.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/images/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'observation-images',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
  },
});
