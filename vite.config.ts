import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    solidPlugin(),
    VitePWA({
      // 'prompt' rather than 'autoUpdate': the new build is fetched and staged
      // in the background either way, but it is applied when the user taps
      // "Ladda om" instead of reloading the page under someone mid-kryss.
      registerType: 'prompt',
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
        // The app shell. index.html is precached together with the hashed
        // assets it references, so the two can never drift apart: a navigation
        // answered from here always gets a self-consistent build.
        globPatterns: ['**/*.{html,js,css,webp,png,svg,woff2}'],
        // Serve every navigation from the precached shell. This is what makes a
        // launch instant and independent of the network — the previous
        // network-only route only fell back to the cache when fetch *rejected*,
        // and a stalled mobile connection does not reject, it hangs.
        //
        // Freshness is not this route's job. The browser re-fetches sw.js,
        // which embeds the precache manifest, so a new build installs in the
        // background and is offered via the reload prompt. The cost is that a
        // user can run the previous build for one launch.
        navigateFallback: 'index.html',
        // Server-rendered routes under /api are real navigations too — the
        // Google Sheets OAuth flow returns to /api/export/google/callback — and
        // must reach the server rather than the app shell.
        navigateFallbackDenylist: [/^\/api\//],
        // 'autoUpdate' used to set this implicitly. Without it the very first
        // visit runs uncontrolled until the next navigation. Safe alongside the
        // reload prompt: a new worker only activates once the user accepts it,
        // so it can never claim a page that loaded a different build's assets.
        clientsClaim: true,
        runtimeCaching: [
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
