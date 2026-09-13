import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(fileURLToPath(new URL('../../dist', import.meta.url)));

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

export const STUB_USER = {
  id: 'u1',
  name: 'Testanvändare',
  email: 'test@example.com',
  image: null,
  city: null,
  about: null,
  settings: null,
};

/**
 * Stands in for the PHP server: just enough of the API for a cold start to
 * populate the caches the offline app reads from. Mirrors the production
 * rewrite rule — anything that is not a file falls through to index.html.
 */
export function startServer(port = 4173) {
  const routes = {
    '/api/health': { ok: true },
    '/api/me': STUB_USER,
    '/api/birds/version': { version: 1 },
    '/api/birds': [
      { id: 'Parus major', swedish: 'Talgoxe', english: 'Great Tit', family: 'Mesar', sortOrder: 1 },
    ],
    '/api/me/stats': {
      uniqueSpeciesLifetime: 1,
      uniqueSpeciesThisYear: 1,
      totalObservations: 1,
      observationsThisWeek: 0,
      observationsThisMonth: 1,
      latestObservation: null,
      topFamilies: [],
    },
    '/api/me/observed': {},
    '/api/me/lists': [],
    '/api/me/memberships': {},
    '/api/me/observations': [],
    '/api/me/invites': [],
    '/api/me/feed': { items: [], nextCursor: null },
    '/api/events': { events: [], total: 0 },
  };

  const server = http.createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');

    if (pathname.startsWith('/api/')) {
      const body = routes[pathname] ?? [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(body));
    }

    let file = path.join(DIST, pathname);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(DIST, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}
