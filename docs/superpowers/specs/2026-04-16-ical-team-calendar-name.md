# iCal Feed: Calendar Name for Team-Filtered Feeds

**Date:** 2026-04-16
**Status:** Draft
**Scope:** Website (`apps/website`), shared calendar package (`packages/calendar`)

## Summary

Change the `X-WR-CALNAME` (and download filename) of the website's iCal feed so that team-filtered feeds are clearly labelled with their season and team name. Also rename the generic base name from `TCW-Vereinskalender` to the shorter `TCW-Kalender`.

## Motivation

Subscribers of team-specific feeds currently see `TCW-Vereinskalender (Herren 40)`. The season is missing, the prefix is long, and the team name is taken from the first match event rather than the team record itself. Using the team record directly gives us an authoritative season and team name and survives feeds that happen to contain no match events at fetch time.

## Current Behavior

Implemented in `apps/website/src/app/api/calendar/route.ts`:

- Base name: `TCW-Vereinskalender`.
- Team filter (`?team=<id>`): `TCW-Vereinskalender (<teamName>)`, where `teamName` comes from the first event's `MatchEventMetadata.teamName`, falling back to the raw `teamId` when no events are present.
- Category filter (`?category=<cat>`): `TCW-Vereinskalender (<categoryLabel>)`.
- No filters: `TCW-Vereinskalender`.

## New Behavior

The feed's calendar name (and the derived download filename) changes as follows:

| Filter                        | Calendar name                          |
| ----------------------------- | -------------------------------------- |
| `team=X` (with or without `category`) | `TCW: {team.season} - {team.name}` |
| `category=Y` only             | `TCW-Kalender ({categoryLabel})`       |
| No filters                    | `TCW-Kalender`                         |
| `team=X` but team not found   | `TCW-Kalender ({teamId})` (fallback)   |

`team.season` and `team.name` come from the nuliga-reader team record (e.g., `Sommer 2026` and `Herren 40` → `TCW: Sommer 2026 - Herren 40`). When a `team` filter is set, the team name format applies regardless of whether `category` is also set — the team identity is what the subscriber cares about.

Category labels (`Punktspiele`, `Turniere`, `Vereinstermine`, `Für Einsteiger`, `Kinder`) are unchanged.

## Design

### Source of team data

`NrTeam` (from `packages/calendar/src/nr-client.ts`) already carries `id`, `season`, and `name`. The existing `fetchNrTeams()` fetcher returns all teams for the club and is revalidated daily. The website app does not currently import this function; we expose it from the package.

### Package surface changes (`packages/calendar`)

Add to `packages/calendar/src/index.ts`:

- Re-export `fetchNrTeams` (value).
- Re-export `NrTeam` (type).

No other package changes are required. No changes to `types.ts`, `fetchers.ts`, or test files in the package.

### Route changes (`apps/website/src/app/api/calendar/route.ts`)

1. Replace the literal `TCW-Vereinskalender` with `TCW-Kalender`.
2. When `teamId` is present:
   - Call `fetchNrTeams()`.
   - Find the team whose `id === teamId`.
   - If found, use `TCW: ${team.season} - ${team.name}` as the calendar name.
   - If not found, use `TCW-Kalender (${teamId})`.
3. Remove the existing `teamLabel` derivation from `events[0]?.metadata`. It is no longer the source of truth for team-filtered feeds.
4. `getCalendarName()` gains a new required parameter for the resolved team (or `null`) and drops its reliance on `teamLabel`.

The filename sanitization at the end of the handler is unchanged. A name like `TCW: Sommer 2026 - Herren 40` sanitizes to `tcw-sommer-2026-herren-40.ics`, which is acceptable.

### Failure modes

- **Team fetch fails.** `fetchNrTeams()` currently throws on non-OK HTTP. The route already has a top-level try/catch that returns 500 with `{ error: 'Failed to generate calendar' }`. We keep that behavior; a failed team fetch surfaces the same 500 as other data-fetch failures. This is acceptable because the subscriber's client will retry on its next poll.
- **Team id provided but not in the response.** Fall back to `TCW-Kalender (${teamId})` as noted above.
- **No events at all.** The calendar body is empty but the name is still correct because it comes from the team record, not the events.

## Tests

`apps/website/src/app/api/calendar/route.ts` does not currently have unit tests. The scope of this change does not require building a full route harness. We add targeted tests for the naming logic only.

Preferred approach: extract `getCalendarName()` (and its category-label map) into a small testable helper module, e.g. `apps/website/src/lib/calendar/calendar-name.ts`, keep the pure function small, and add `__tests__/calendar-name.test.ts` covering:

- No filters → `TCW-Kalender`.
- Category only (each of the five labels) → `TCW-Kalender ({label})`.
- Team found (regardless of category) → `TCW: {season} - {teamName}`.
- Team id with no matching team → `TCW-Kalender ({teamId})`.

No new tests are required in `packages/calendar` — re-exports do not need coverage.

## Out of Scope

- The TV app's `Vereinskalender` screen title (unrelated to this feed).
- Any UI copy on the website (e.g., iCal button labels) that references the old name — no callers were found in the code search; if any are discovered during implementation, they should be updated in the same change.
- Changes to filter semantics, caching, or the iCal event payload.

## Rollout

Single change set, shipped together:

1. Build the calendar package (`pnpm --filter @tcw/calendar build`).
2. Ship the route change and the new tests.
3. Existing subscribers will see the new calendar name on their next refresh. Downloaded `.ics` filenames change for new downloads. No migration required.
