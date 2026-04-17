## Project Overview

`@tcw/dispo` is the court-assignment admin app for TC Waiblingen. Internal tool that lets a privileged user assign Directus courts to scheduled home matches. Persists assignments in a local SQLite file. Exposes a public `/today` page and a `/api/today` JSON endpoint consumed by the TV display.

Same stack as `apps/website`: Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4. Uses `@tcw/calendar` (workspace) for nuliga match data and the court-usage compute. Runs on port `3002`.

See the parent `AGENTS.md` for monorepo-wide conventions.

## Development Commands

Tasks live in the monorepo-root `mise.toml` and are namespaced `<verb>:dispo`. Run from anywhere in the repo:

- `mise run dev:dispo` — Dev server on http://localhost:3002
- `mise run check:dispo` — Lint, test, build (full local check)
- `mise run test:dispo` — Vitest once
- `mise run lint:dispo` — ESLint
- `mise run build:dispo` — Production build (depends on `build:calendar`)
- `mise run docker-up:dispo` — Build & run via docker compose
- `mise run build:calendar` — Rebuild `@tcw/calendar` after changing it

Equivalent without mise (from this directory): `pnpm dev`, `pnpm lint`, `pnpm test`, `pnpm build`. Rebuild the calendar package from the monorepo root: `pnpm --filter @tcw/calendar build`.

## Environment

Copy `.env.example` to `.env` and fill in:
- `DIRECTUS_TOKEN` — server-side token, used by `fetchCourts()`
- `NR_API_TOKEN` — nuliga-reader bearer
- `DISPO_PASSWORD` — shared password for the local "operator" login
- `DISPO_SESSION_SECRET` — random 32+ bytes (`openssl rand -hex 32`); signs the session JWT (HS256)
- `DISPO_DB_PATH` — defaults to `./data/dispo.db` locally, `/data/dispo.db` in Docker
- `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET` — Microsoft Entra app registration. Redirect URI must include `/api/auth/entra/callback` (per env)
- `ENTRA_ADMIN_ROLE` — Entra app-role value mapped to `admin` (defaults to `Dispo.Admin`); other Entra users become `operator`

## Architecture

- `src/app/page.tsx` — Admin home: full year calendar (court-usage heat-map). Click a day → `/day/[date]`.
- `src/app/day/[date]/page.tsx` — Tabular assignment form (matches × courts, checkboxes).
- `src/app/today/page.tsx` — Public read-only view of today's assignment.
- `src/app/api/today/route.ts` — Match-centric JSON for the TV.
- `src/proxy.ts` — Next 16 proxy: cookie-session gate for `/`, `/day/*`, `POST /api/assignments`. Both `operator` and `admin` roles pass.
- `src/lib/db.ts` — `better-sqlite3` wrapper + `applySchema()`.
- `src/lib/assignments.ts` — `getForDate`, `replaceForDate`, `conflictsForDate`.
- `src/lib/auth.ts` — Session JWT (HS256 via `jose`) carrying `{ sub, role }`; `getSession()` for server components.
- `src/lib/entra.ts` — `openid-client` wrapper: discovery, authorization URL with PKCE, callback exchange, role mapping from the Entra `roles` claim.
- `src/app/api/auth/entra/{start,callback}/route.ts` — Entra OIDC flow.
- `src/lib/matches.ts` + `src/lib/match-cache.ts` — wraps `@tcw/calendar`'s `fetchMatches` with a 5-minute in-memory cache.
- `src/lib/directus/courts.ts` — single-purpose `fetchCourts()`.

## Design Decisions

- Assignments are normalized one row per (match, court) — see `src/lib/db.ts`.
- Saving a date is replace-all in a single transaction (no diffing).
- Conflicts (same court, same time) warn but do not block save.
- The "popup" is implemented as a dedicated page `/day/[date]` (URL-bookmarkable) rather than a modal.
- Public `/today` only — no historical date browsing.

## Code Style

- Two spaces, no semicolons, single quotes (Prettier).
- `clsx` for conditional classes.
- `text-body` / `text-muted` semantic colour classes (defined in `globals.css`).
- All clickable elements need `cursor-pointer`.
