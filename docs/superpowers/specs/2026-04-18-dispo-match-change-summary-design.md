# Match-change summary on dispo home page

## Goal

Show the same 30-day match-change summary on the `apps/dispo` admin home page that already appears under the court-usage calendar on `apps/website` (see `apps/website/src/components/blocks/BlockClubCalendar/index.tsx` and `CourtUsageChanges.tsx`).

## Scope

In scope:
- New component and helpers in `apps/dispo`.
- Wiring into `apps/dispo/src/app/page.tsx` below the existing `<CourtUsageClient>`.

Out of scope:
- Caching the change data (the website does not cache it either).
- Extracting the component or helpers to `@tcw/calendar`.
- Styling tweaks beyond matching the website.
- Changing the website.

## Approach

Duplicate the website component and its two helpers into `apps/dispo`. The logic (`buildMatchChangeSummary`, `fetchNrMatchChanges`, `fetchNrMatches`, `fetchNrTeams`) already lives in the shared `@tcw/calendar` package; only the presentation layer gets copied. This matches the repo convention that calendar logic is shared but components live per-app.

## Files to add in `apps/dispo`

### `src/lib/relative-date.ts`
Verbatim copy of `apps/website/src/lib/relative-date.ts`. Exports `formatRelativeDate(date, now?)`.

### `src/lib/team-label.ts`
Verbatim copy of `apps/website/src/lib/team-label.ts`. Exports `teamLabelWithGroup(teamName, group)`.

### `src/lib/match-changes.ts`
New file. Exports `fetchMatchChangeGroups(now: Date): Promise<MatchChangeSummaryGroup[]>`.

Behavior:
- Range: `from = new Date(now.getFullYear(), 0, 1)`, `to = new Date(now.getFullYear(), 11, 31, 23, 59, 59)`.
- `since = now - 30 days`.
- Runs three calls in parallel via `Promise.all`:
  - `fetchNrMatchChanges({ since, fields: ['__created', 'match_date', 'match_time', 'location'] })`
  - `fetchNrMatches(from, to)` (positional dates)
  - `fetchNrTeams()`
  All three read nr-client config from env internally — no config argument.
- Calls `buildMatchChangeSummary({ changes, matches, teams, formatTeamLabel: (team) => teamLabelWithGroup(team.name, team.group) })`.
- On error, logs via `console.warn('Failed to load match changes', error)` and returns `[]`.

### `src/components/calendar/CourtUsageChanges.tsx`
Copy of `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageChanges.tsx`. Only change: import path for `formatRelativeDate` becomes `@/lib/relative-date` (unchanged alias, same relative position).

### Tests
- `src/lib/__tests__/relative-date.test.ts` — mirror the website test if one exists; otherwise a minimal happy-path test covering "heute", "gestern", "vor N Tagen", and the week/month branches.
- `src/lib/__tests__/team-label.test.ts` — port from `apps/website/src/lib/__tests__/team-label.test.ts`.
- No test for `CourtUsageChanges.tsx` — the website already covers it and the dispo copy is identical.

## Wiring: `src/app/page.tsx`

- Add `const now = new Date()` (replace the inline `new Date().getFullYear()`).
- Add `fetchMatchChangeGroups(now)` to the existing `Promise.all` alongside `fetchAllEventsForYear(year)` and `fetchCourts()`.
- Render `<CourtUsageChanges groups={changeGroups} now={now} />` after `<CourtUsageClient ... />`.
- Keep the existing `export const dynamic = 'force-dynamic'`.

## Behavior parity with the website

- Component returns `null` when `groups.length === 0` — same auto-hide behavior.
- `print:hidden` styling is preserved (irrelevant for dispo but harmless).
- The list styling uses `border-tcw-accent-*` which is defined in dispo's Tailwind theme (same as website).

## Verification

1. `mise run lint:dispo` passes.
2. `mise run test:dispo` passes (new helper tests included).
3. `mise run build:dispo` completes.
4. Manual: run `mise run dev:dispo`, sign in as admin/operator, confirm the "Änderungen (letzte 30 Tage)" section appears below the year calendar with the same grouping and formatting as the website. If there are no recent changes, the section is absent.
