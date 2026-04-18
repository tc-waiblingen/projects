# Graceful handling of external fetch failures in `@tcw/dispo`

## Problem

In `apps/dispo`, server-rendered pages fetch from external data sources (Directus for courts, nuliga + Directus via `@tcw/calendar` for matches, tournaments, club events). When any of those fetches throw — e.g. Directus is unreachable — the throw bubbles to Next.js and `app/error.tsx` renders a generic "Etwas ist schiefgelaufen" / 500 page. The admin has no indication of *what* failed and no partial view of the data that did load.

## Goals

- Each external fetch fails independently. A failure in one source does not hide data that loaded from the others.
- Each failure renders a named, German-language banner so the admin can recognise which source is degraded.
- The existing full-page `app/error.tsx` remains for truly unexpected errors (e.g. local SQLite open failure).

## Non-goals

- `/api/today` is not in scope. It is consumed by the TV display, which needs structured errors rather than pretty pages; unchanged for now.
- No retry / circuit-breaker logic. The Directus client already retries network blips via `fetchRetryAndCache`.
- No new logging/alerting pipeline beyond `console.error` (observable in existing container logs).

## Scope

Routes covered:

- `/` (`src/app/page.tsx`) — home year calendar
- `/day/[date]` (`src/app/day/[date]/page.tsx`) — assignment form
- `/today` (`src/app/today/page.tsx`) — public read-only view

## Design

### Shared helper

`src/lib/fetch-result.ts`

```ts
export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: unknown }

export async function settle<T>(p: Promise<T>): Promise<FetchResult<T>> {
  try {
    return { ok: true, data: await p }
  } catch (error) {
    console.error('External fetch failed:', error)
    return { ok: false, error }
  }
}
```

Pages replace `Promise.all([fetchA(), fetchB(), ...])` with
`Promise.all([settle(fetchA()), settle(fetchB()), ...])` and branch on `.ok`.

### Shared component

`src/components/SourceErrorBanner.tsx`

- Props: `source: 'courts' | 'matches' | 'tournament' | 'events'`, `variant?: 'block' | 'inline'` (default `block`).
- Copy is centralised in a `sourceErrorMessage(source)` map so wording is consistent across pages.
- Styling mirrors the existing amber warning banner used in `/day/[date]/page.tsx:58` for "no courts configured".
- `inline` variant is visually smaller (single line, no bold lead); used only for the non-critical tournament case.

Copy (German):

| source       | block message |
|--------------|---------------|
| `courts`     | **Plätze nicht verfügbar.** Directus ist derzeit nicht erreichbar — Zuweisung aktuell nicht möglich. |
| `matches`    | **Spiele nicht verfügbar.** Spielplan-Quelle ist derzeit nicht erreichbar. |
| `events`     | **Kalender nicht verfügbar.** Spiel- und Vereinstermine konnten nicht geladen werden. |
| `tournament` (inline) | Turnier-Status konnte nicht geprüft werden. |

### Read-only match list

`src/components/MatchList.tsx`

- Renders `DayMatch[]` as a compact read-only list (time, home team, opponent, league short).
- Used on `/day/[date]` and `/today` when `fetchCourts()` fails but matches loaded, so the admin still sees the day's schedule.
- No interactivity, no court columns.

### Page behaviour

**`/day/[date]`** — three independent fetches: `matches`, `tournament`, `courts`.

| matches | tournament | courts | rendered content |
|---------|------------|--------|------------------|
| ok      | ok         | ok     | existing happy path |
| ok      | ok         | fail   | tournament banner (if any) + `<SourceErrorBanner source="courts">` + `<MatchList>` |
| ok      | fail       | ok     | inline tournament note + existing form |
| ok      | fail       | fail   | inline tournament note + `<SourceErrorBanner source="courts">` + `<MatchList>` |
| fail    | *          | ok     | `<SourceErrorBanner source="matches">`; tournament banner/note as applicable |
| fail    | *          | fail   | `<SourceErrorBanner source="matches">` + `<SourceErrorBanner source="courts">` |

Notes:

- Tournament success still renders the existing red tournament banner.
- When `matches` fail, no list is shown (nothing to show) — only the banner.
- When `courts` fail but `matches` succeed, matches render as read-only list; assignment form is suppressed.

**`/today`** — mirrors `/day/[date]` without a form:

- `matches` fail → `<SourceErrorBanner source="matches">`, no table, no list.
- `courts` fail → `<SourceErrorBanner source="courts">` + `<MatchList>` (no court-name resolution possible).
- `tournament` fail → inline note; existing table still renders when matches + courts are ok.
- Stored assignments come from local SQLite; failures there continue to fall through to the default error boundary.

**`/`** — two fetches: `events` (year calendar) and `courts`.

- `events` fail → `<SourceErrorBanner source="events">` in place of `<CourtUsageClient>`; court counts still rendered if available.
- `courts` fail → `<SourceErrorBanner source="courts">` + heat-map renders in **neutral gray only** (all cells shown, no color scale), by passing a new `courtsUnavailable?: boolean` prop to `CourtUsageClient` that short-circuits the usage-%-to-color mapping.
- Both fail → both banners, no heat-map.

### `CourtUsageClient` change

- Add optional prop `courtsUnavailable?: boolean`.
- When `true`: render all day cells in a single neutral gray (reuse existing `tcw-accent-*` scale's muted tone) instead of the usage colour scale. Match markers / tournament markers still render, since they're event-derived, not court-derived.
- When `false` or omitted: current behaviour unchanged.

## Testing

The existing `apps/dispo` test suite (`src/lib/__tests__/`) is unit tests on lib helpers only — no component/page tests, no React Testing Library dependency. Keep that convention: cover the new logic via unit tests on pure helpers; verify page rendering manually in the dev server.

Add unit tests:

- `src/lib/__tests__/fetch-result.test.ts` — `settle()` returns `{ok: true, data}` on resolve, `{ok: false, error}` on reject, logs to `console.error` on reject.
- `src/lib/__tests__/source-error-message.test.ts` — each `source` key returns a non-empty German string; both variants covered where applicable.

Manual verification (dev server, `mise run dev:dispo`):

1. Happy path — `/`, `/day/<date>`, `/today` render as today.
2. Simulate Directus outage: set `DIRECTUS_TOKEN=invalid` (forces 401 on `fetchCourts`, `fetchClubEvents`) and reload each route. Expect `courts` and `events` banners as designed; `/` heat-map in neutral gray; `/day` shows match list; no 500.
3. Simulate nuliga outage: set `NR_API_TOKEN=invalid` and reload. Expect `matches` / `events` banners on the respective pages.
4. Simulate tournament-only failure: temporarily throw inside `fetchTournamentForDate` and confirm inline note on `/day` and `/today`; form/table still usable.

## Out of scope / future

- Exposing retry UI beyond what `app/error.tsx` already offers (banners are informational; pages re-render on navigation / refresh).
- Translating errors into structured responses for `/api/today`.
- Instrumenting a Sentry-style error reporter.
