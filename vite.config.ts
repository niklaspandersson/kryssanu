import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    solidPlugin(),
    VitePWA({
      // 'prompt' is the mode that does NOT call skipWaiting() on install; the
      // new build is precached and then waits. src/lib/swUpdate.ts decides when
      // to let it take over — see the comment there — so there is no prompt and
      // no reload underneath someone mid-kryss. 'autoUpdate' would swap the
      // worker out from under the running page instead.
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
        // background and takes over on the next launch or the next in-app
        // navigation. The cost is that a user can run the previous build until
        // one of those happens.
        navigateFallback: 'index.html',
        // Server-rendered routes under /api are real navigations too — the
        // Google Sheets OAuth flow returns to /api/export/google/callback — and
        // must reach the server rather than the app shell.
        navigateFallbackDenylist: [/^\/api\//],
        // 'autoUpdate' used to set this implicitly. Without it the very first
        // visit runs uncontrolled until the next navigation. Safe here because a
        // staged worker only activates when swUpdate.ts hands over, and that is
        // immediately followed by a full load of the new build.
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
