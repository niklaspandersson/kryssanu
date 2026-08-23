# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kryssanu (kryssa.nu) is a Swedish birdwatching social platform. Users log bird observations, track stats, compete in events, and view activity feeds. The UI is entirely in Swedish.

## Tech Stack

- **Frontend:** Solid.js + TypeScript, built with Vite, styled with CSS Modules
- **Backend:** PHP 8.2+ with Slim Framework 4, located in `packages/server-php/`
- **Database:** MySQL via PDO, schema managed with Prisma (`prisma/schema.prisma`)
- **Auth:** Google OAuth 2.0 with HTTP-only session cookies (30-day expiry)
- **Deployment:** Docker multi-stage build (Node for frontend build, PHP-Apache for runtime)

## Commands

```bash
# Start dev (frontend on :3000, PHP API on :3001 with Vite proxy)
npm run dev

# Build frontend to /dist
npm run build

# Push Prisma schema to database
npm run db:push

# Seed bird data
npm run db:seed

# End-to-end tests (Playwright)
npm run test:db:up      # start the test MySQL (docker compose, port 3307)
npm run test:e2e        # provision the test DB, then run the suite
npm run test:e2e:ui     # same, in Playwright's UI mode
npm run test:db:down    # stop and wipe the test MySQL

npm run typecheck       # tsc --noEmit over src/ and e2e/
```

No linter is configured. (`.eslintrc.cjs` and `.eslintrc.json` are stale
leftovers — two conflicting configs, one of them a Next.js preset in a Solid
app — and ESLint is not a dependency. Ignore them.)

## Testing

End-to-end tests live in `e2e/` and run with Playwright against a real MySQL
and the real PHP API. There are no unit tests.

- `e2e/provision.ts` — pushes the schema, applies the `Bird.status`
  `utf8mb4_bin` collation fix, seeds birds, creates the fixture users. Runs
  before Playwright starts, not from a global setup: Playwright boots its
  `webServer` first, and the API readiness probe reads the `Bird` table.
- `e2e/auth.setup.ts` — a setup project that mints a session via
  `GET /api/auth/dev-login?email=…` (registered whenever `APP_ENV !== 'production'`)
  and saves it to `e2e/.auth/user.json`. No Google OAuth is involved.
- `e2e/db.ts` — `resetData()` truncates user-owned tables between tests but
  leaves `Bird`, `User` and `Session` alone, so the stored session stays valid.
- `e2e/fixtures.ts` — the shared `page` fixture: data reset, third-party stubs,
  localStorage seeding.

Writing specs, two things to know:

- **Material Icons are ligature icons.** `Icon.tsx` renders the icon name as the
  span's text, so an icon+text button's accessible name is polluted
  (`<Icon name="edit"/> Ändra` → `"edit Ändra"`, and whether the space survives
  depends on JSX line breaks). Match Swedish fragments with a regex; never use
  `exact: true` on a mixed icon+text button.
- **Only `ConfirmDialog` has `role="dialog"`.** `TopSheet` and `BottomSheet` have
  no role and no Escape handler — they close on backdrop click.

## Architecture

### Frontend (`src/`)

- **Entry:** `index.html` → `src/index.tsx` → `src/App.tsx` (router + route protection)
- **Routing:** `@solidjs/router` with a `Protected` wrapper for auth-required routes
- **State:** Solid.js signals and `createResource` for async data — no external state library
- **Global layout:** `AppShell.tsx` wraps all authenticated pages (nav, search, sidebar)
- **API client:** `src/lib/api.ts` — typed fetch wrapper for all endpoints
- **Types:** `src/lib/types.ts` — shared TypeScript interfaces for data models
- **Auth context:** `src/lib/auth.tsx` — Google OAuth integration, provides user session

### Backend (`packages/server-php/`)

- **Entry:** `public/app.php` — Slim app initialization, middleware, route registration
- **Routes:** `src/Routes/*.php` — Auth, Birds, Events, Lists, Me, Stats, Export
- **Middleware:** `SessionMiddleware` (validates session on all requests), `AuthMiddleware` (enforces auth)
- **Database:** `src/Database.php` — PDO singleton for MySQL
- **Session cleanup:** `bin/cleanup-sessions.php` (cron job)

### API

All API routes are under `/api`. In dev, Vite proxies `/api` to the PHP server on port 3001.

### Database

Prisma schema in `prisma/schema.prisma` defines: User, GoogleToken, Session, Bird, Observation, Event, ObservationEvent, Participant, List, ObservationList, InviteToken. Bird IDs are latin species names. User/Event IDs are CUIDs.

## Key Conventions

- CSS Modules for component styling (`*.module.css` alongside components)
- Swedish locale throughout (date formatting uses `sv-SE`)
- Material Icons via Google Fonts CDN (use `<Icon>` component)
- Mobile-first responsive design with bottom sheets for modals
- PHP dependencies managed with Composer (`packages/server-php/composer.json`)

## Environment Variables

Required in `.env` (see `.env.example`):

- `DATABASE_URL` — MySQL connection string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID exposed to the client
- `APP_URL` — base URL used for OAuth redirect URIs

Optional:

- `IMAGE_UPLOAD_DIR` — filesystem directory for user-uploaded observation images (defaults to `packages/server-php/user-images`)

## Instructions

- Be concise but complete in explanations; assume the reader is a competent fullstack developer, familiary to this codebase.
- Do not include any information that is not directly relevant to understanding the code structure, build process, or conventions.
- Do not make any changes outside of what is requested in the prompt. If you need to clarify something, ask for clarification instead of making assumptions.
