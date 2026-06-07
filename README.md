# Kryssanu

**Kryssanu** ([kryssa.nu](https://kryssa.nu)) is a Swedish birdwatching social platform. Users log bird observations, build species lists, track stats, compete in events, and view their activity over time. The UI is entirely in Swedish.

## Tech Stack

- **Frontend:** [Solid.js](https://www.solidjs.com/) + TypeScript, built with [Vite](https://vitejs.dev/), styled with CSS Modules. Installable as a PWA (`vite-plugin-pwa`).
- **Backend:** PHP 8.2+ with [Slim Framework 4](https://www.slimframework.com/), in `packages/server-php/`.
- **Database:** MySQL via PDO, schema managed with [Prisma](https://www.prisma.io/) (`prisma/schema.prisma`).
- **Auth:** Google OAuth 2.0 with HTTP-only session cookies (30-day expiry).
- **Deployment:** Docker multi-stage build (Node to build the frontend, PHP-Apache for runtime).

## Getting Started

### Prerequisites

- Node.js 18+
- PHP 8.2+
- MySQL
- A Google OAuth 2.0 client ID/secret

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env   # then fill in DATABASE_URL and Google OAuth credentials

# Push the schema and seed bird data
npm run db:push
npm run db:seed

# Start dev (frontend on :3000, PHP API on :3001 with a Vite proxy for /api)
npm run dev
```

### Scripts

| Command          | Description                                  |
| ---------------- | -------------------------------------------- |
| `npm run dev`    | Run the Vite client and PHP API concurrently |
| `npm run build`  | Build the frontend to `/dist`                |
| `npm run preview`| Preview the production build                  |
| `npm run db:push`| Push the Prisma schema to the database       |
| `npm run db:seed`| Seed bird data                               |

There is no test runner or linter configured.

## Features

- **Observations** — log bird sightings; edit individually or in bulk.
- **Lists** — build and view custom species lists.
- **Birds** — browse the species catalogue with per-bird detail pages.
- **Events** — create events and invite others via QR code to compete.
- **Stats & summary** — track personal birdwatching statistics over time.
- **Export** — export bird data.

See [WISHLIST.md](WISHLIST.md) for planned and out-of-scope ideas.

## Architecture

### Frontend (`src/`)

- **Entry:** `index.html` → `src/index.tsx` → `src/App.tsx` (router + route protection).
- **Routing:** `@solidjs/router` with a `Protected` wrapper for auth-required routes.
- **Pages:** `src/pages/` — one component (and CSS Module) per route.
- **State:** Solid.js signals and `createResource` for async data — no external state library.
- **API client:** `src/lib/api.ts` — typed fetch wrapper for all endpoints.
- **Types:** `src/lib/types.ts` — shared data-model interfaces.
- **Auth context:** `src/lib/auth.tsx` — Google OAuth integration and user session.

### Backend (`packages/server-php/`)

- **Entry:** `public/app.php` — Slim app init, middleware, route registration.
- **Routes:** `src/Routes/*.php` — Auth, Birds, Events, Lists, Me, Stats, Export.
- **Middleware:** `SessionMiddleware` (validates session on all requests), `AuthMiddleware` (enforces auth).
- **Database:** `src/Database.php` — PDO singleton for MySQL.
- **Session cleanup:** `bin/cleanup-sessions.php` (cron job).

All API routes live under `/api`. In dev, Vite proxies `/api` to the PHP server on port 3001.

### Database

The Prisma schema defines: `User`, `GoogleToken`, `Session`, `Bird`, `Observation`, `Event`, `ObservationEvent`, `Participant`, `List`, `ObservationList`, and `InviteToken`. Bird IDs are latin species names; User/Event IDs are CUIDs.

## Environment Variables

See `.env.example`:

- `DATABASE_URL` — MySQL connection string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID exposed to the client
- `APP_URL` — base URL used for OAuth redirect URIs

## Conventions

- CSS Modules for component styling (`*.module.css` alongside components).
- Swedish locale throughout (date formatting uses `sv-SE`).
- Material Icons via the Google Fonts CDN (use the `<Icon>` component).
- Mobile-first responsive design with bottom sheets for modals.
- PHP dependencies managed with Composer (`packages/server-php/composer.json`).
