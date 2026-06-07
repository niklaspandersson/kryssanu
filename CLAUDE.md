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
```

No test runner or linter is configured.

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
