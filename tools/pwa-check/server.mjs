import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DIST = path.resolve(fileURLToPath(new URL('../../dist', import.meta.url)));

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
  // Mutable so a test can swap in a second build, the way a deploy does.
  let dist = DEFAULT_DIST;
  /** While set, every request is accepted and never answered. */
  let stalled = false;
  /** Writes that reached the server, as "METHOD /path". */
  const writes = [];
  let nextId = 1;
  const routes = {
    '/api/health': { ok: true },
    '/api/me': STUB_USER,
    '/api/birds/version': { version: 1 },
    // Every Bird field matters: search drops anything isSubspecies() accepts,
    // and a missing parentId is not null.
    '/api/birds': [
      {
        id: 'Parus major',
        swedish: 'Talgoxe',
        english: 'Great Tit',
        family: 'Mesar',
        familyLatin: 'Paridae',
        orderLatin: 'Passeriformes',
        orderSwedish: 'Tättingar',
        parentId: null,
        kategori: 'A',
        status: null,
        extinct: false,
        delisted: false,
      },
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
    // A live link that passes no traffic: shell, sw.js and API alike.
    if (stalled) return;

    const { pathname } = new URL(req.url, 'http://localhost');

    if (req.method !== 'GET') writes.push(`${req.method} ${pathname}`);

    if (req.method === 'POST' && pathname === '/api/me/observations') {
      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ id: `obs-${nextId++}` }));
    }
    if (req.method === 'POST' && /^\/api\/me\/observations\/[^/]+\/images$/.test(pathname)) {
      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ id: `img-${nextId++}`, url: '', thumbUrl: '' }));
    }

    if (pathname.startsWith('/api/')) {
      const body = routes[pathname] ?? [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(body));
    }

    let file = path.join(dist, pathname);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(dist, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, () =>
      resolve({
        close: () => {
          // Requests held open by stall() would otherwise keep it alive.
          server.closeAllConnections();
          server.close();
        },
        /** Start or stop answering. Requests made while stalled stay unanswered. */
        stall(on) {
          stalled = on;
        },
        writes,
        /** Point the server at a different build directory. */
        serve(dir) {
          dist = path.resolve(dir);
        },
      })
    );
  });
}
