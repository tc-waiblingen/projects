# iCal Team Calendar Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the website's iCal feed from `TCW-Vereinskalender` to `TCW-Kalender`, and give team-filtered feeds a clearer name in the form `TCW: {season} - {team name}`, using team data fetched directly from nuliga-reader rather than derived from match events.

**Architecture:** The iCal route in `apps/website/src/app/api/calendar/route.ts` already computes a calendar name. We extract that logic into a small pure helper (`apps/website/src/lib/calendar/calendar-name.ts`) so it can be unit-tested in isolation, then teach the route to resolve the team via `fetchNrTeams()` (from `@tcw/calendar`) and pass the resolved team into the helper.

**Tech Stack:** TypeScript, Next.js 16 App Router, Vitest, `ical-generator`, `@tcw/calendar` workspace package, nuliga-reader REST client.

**Reference spec:** `docs/superpowers/specs/2026-04-16-ical-team-calendar-name.md`

---

## File Structure

- **Create:** `apps/website/src/lib/calendar/calendar-name.ts` — pure helper `getCalendarName()` and `CATEGORY_LABELS` constant. Single responsibility: name derivation.
- **Create:** `apps/website/src/lib/calendar/__tests__/calendar-name.test.ts` — unit tests for the helper.
- **Modify:** `packages/calendar/src/index.ts` — re-export `fetchNrTeams` and `NrTeam`.
- **Modify:** `apps/website/src/app/api/calendar/route.ts` — replace inline `getCalendarName()` with the helper, fetch teams, resolve the filtered team, drop `teamLabel` derivation from events, update base string.

---

## Task 1: Export `fetchNrTeams` and `NrTeam` from the calendar package

**Files:**
- Modify: `packages/calendar/src/index.ts`

- [ ] **Step 1: Add the re-exports**

Open `packages/calendar/src/index.ts`. `fetchNrTeams` and `NrTeam` live in `./nr-client` and are not currently re-exported from `./fetchers`, so add them directly from `./nr-client`. Append a new block immediately after the existing "Fetchers" block (which currently ends at `} from './fetchers'`):

```ts
// Nr-client (nuliga-reader)
export { fetchNrTeams } from './nr-client'
export type { NrTeam } from './nr-client'
```

Do not modify the existing "Fetchers" block.

- [ ] **Step 2: Rebuild the package**

Run: `pnpm --filter @tcw/calendar build`
Expected: build completes, `packages/calendar/dist/index.d.ts` contains `export { fetchNrTeams }` and `export type { NrTeam }`.

Verify with:
```bash
grep -E "fetchNrTeams|NrTeam" packages/calendar/dist/index.d.ts
```
Expected output includes at least one line containing `fetchNrTeams` and one containing `NrTeam`.

- [ ] **Step 3: Run the package's own tests to confirm no regression**

Run: `pnpm --filter @tcw/calendar test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/calendar/src/index.ts
git commit -m "feat(calendar): export fetchNrTeams and NrTeam type"
```

---

## Task 2: Create the `getCalendarName` helper with tests (TDD)

**Files:**
- Create: `apps/website/src/lib/calendar/calendar-name.ts`
- Create: `apps/website/src/lib/calendar/__tests__/calendar-name.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `apps/website/src/lib/calendar/__tests__/calendar-name.test.ts` with:

```ts
import { describe, expect, it } from 'vitest'
import { getCalendarName } from '../calendar-name'

describe('getCalendarName', () => {
  it('returns the base name when no filters are given', () => {
    expect(
      getCalendarName({ category: null, team: null, teamId: null }),
    ).toBe('TCW-Kalender')
  })

  it('returns the base name with the category label for each category', () => {
    expect(
      getCalendarName({ category: 'matches', team: null, teamId: null }),
    ).toBe('TCW-Kalender (Punktspiele)')
    expect(
      getCalendarName({ category: 'tournaments', team: null, teamId: null }),
    ).toBe('TCW-Kalender (Turniere)')
    expect(
      getCalendarName({ category: 'club', team: null, teamId: null }),
    ).toBe('TCW-Kalender (Vereinstermine)')
    expect(
      getCalendarName({ category: 'beginners', team: null, teamId: null }),
    ).toBe('TCW-Kalender (Für Einsteiger)')
    expect(
      getCalendarName({ category: 'children', team: null, teamId: null }),
    ).toBe('TCW-Kalender (Kinder)')
  })

  it('returns the team-specific name when a team is resolved', () => {
    expect(
      getCalendarName({
        category: null,
        team: { season: 'Sommer 2026', name: 'Herren 40' },
        teamId: '123',
      }),
    ).toBe('TCW: Sommer 2026 - Herren 40')
  })

  it('uses the team-specific name even when a category is also set', () => {
    expect(
      getCalendarName({
        category: 'matches',
        team: { season: 'Sommer 2026', name: 'Herren 40' },
        teamId: '123',
      }),
    ).toBe('TCW: Sommer 2026 - Herren 40')
  })

  it('falls back to the base name with the team id when team is not resolved', () => {
    expect(
      getCalendarName({ category: null, team: null, teamId: '123' }),
    ).toBe('TCW-Kalender (123)')
  })

  it('uses the team-id fallback even when a category is set', () => {
    expect(
      getCalendarName({ category: 'matches', team: null, teamId: '123' }),
    ).toBe('TCW-Kalender (123)')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @tcw/website test -- calendar-name`
Expected: FAIL with a module-not-found error like `Cannot find module '../calendar-name'`.

- [ ] **Step 3: Write the helper**

Create `apps/website/src/lib/calendar/calendar-name.ts` with:

```ts
export type CategoryFilter =
  | 'matches'
  | 'tournaments'
  | 'club'
  | 'beginners'
  | 'children'

export const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  matches: 'Punktspiele',
  tournaments: 'Turniere',
  club: 'Vereinstermine',
  beginners: 'Für Einsteiger',
  children: 'Kinder',
}

export interface ResolvedTeam {
  season: string
  name: string
}

export interface GetCalendarNameArgs {
  category: CategoryFilter | null
  team: ResolvedTeam | null
  teamId: string | null
}

const BASE_NAME = 'TCW-Kalender'

export function getCalendarName(args: GetCalendarNameArgs): string {
  const { category, team, teamId } = args

  if (team) {
    return `TCW: ${team.season} - ${team.name}`
  }

  if (teamId) {
    return `${BASE_NAME} (${teamId})`
  }

  if (category) {
    return `${BASE_NAME} (${CATEGORY_LABELS[category]})`
  }

  return BASE_NAME
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @tcw/website test -- calendar-name`
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/lib/calendar/calendar-name.ts apps/website/src/lib/calendar/__tests__/calendar-name.test.ts
git commit -m "feat(website): add calendar-name helper for iCal feed"
```

---

## Task 3: Wire the helper into the iCal route and use team data from nuliga-reader

**Files:**
- Modify: `apps/website/src/app/api/calendar/route.ts`

- [ ] **Step 1: Replace imports, inline types, and the inline `getCalendarName`**

Open `apps/website/src/app/api/calendar/route.ts`. Replace the top-of-file imports and the two helpers (`getSourceForCategory` and `getCalendarName`) so the file begins like this:

```ts
import { NextRequest, NextResponse } from 'next/server'
import ical, { ICalCalendarMethod, ICalEventStatus } from 'ical-generator'
import { fetchAllCalendarEvents } from '@/lib/directus/calendar-fetchers'
import { isMatchPlayed } from '@/lib/match-utils'
import { fetchNrTeams, type NrTeam } from '@tcw/calendar'
import {
  getCalendarName,
  type CategoryFilter,
} from '@/lib/calendar/calendar-name'
import type {
  CalendarEvent,
  CalendarEventSource,
  ClubEventMetadata,
  MatchEventMetadata,
  TournamentEventMetadata,
} from '@tcw/calendar'

function getSourceForCategory(category: CategoryFilter): CalendarEventSource[] {
  switch (category) {
    case 'matches':
      return ['match']
    case 'tournaments':
      return ['tournament']
    case 'club':
      return ['club', 'app']
    case 'beginners':
    case 'children':
      return ['club']
    default:
      return []
  }
}
```

Delete the old inline `type CategoryFilter = …` declaration and the old `getCalendarName(...)` function entirely. `filterEvents` below them is unchanged.

- [ ] **Step 2: Update the `GET` handler to resolve the team via `fetchNrTeams()`**

Still in `route.ts`, replace the body of `GET` (lines currently starting at `const { searchParams } = new URL(request.url)` through `const calendarName = getCalendarName(category, teamLabel)`) with:

```ts
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as CategoryFilter | null
    const teamId = searchParams.get('team')

    const [allEvents, teams] = await Promise.all([
      fetchAllCalendarEvents(),
      teamId ? fetchNrTeams() : Promise.resolve<NrTeam[]>([]),
    ])
    const events = filterEvents(allEvents, category, teamId)

    const resolvedTeam = teamId
      ? (teams.find((t) => t.id === teamId) ?? null)
      : null
    const calendarName = getCalendarName({
      category,
      team: resolvedTeam
        ? { season: resolvedTeam.season, name: resolvedTeam.name }
        : null,
      teamId,
    })
```

Do not change any code below the `const calendarName = …` assignment (the `ical({ … })` construction, event loop, and response).

- [ ] **Step 3: Type-check and lint**

Run: `pnpm --filter @tcw/website lint`
Expected: no errors.

Run: `pnpm --filter @tcw/website exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full website test suite**

Run: `pnpm --filter @tcw/website test`
Expected: all tests pass, including the new `calendar-name` tests.

- [ ] **Step 5: Manual smoke test the endpoint**

Start the dev server: `pnpm --filter @tcw/website dev`

In another terminal, hit each case and check the `X-WR-CALNAME` / `SUMMARY` line in the returned `.ics`:

```bash
curl -s 'http://localhost:3000/api/calendar' | grep -E '^X-WR-CALNAME'
# Expected: X-WR-CALNAME:TCW-Kalender

curl -s 'http://localhost:3000/api/calendar?category=matches' | grep -E '^X-WR-CALNAME'
# Expected: X-WR-CALNAME:TCW-Kalender (Punktspiele)

curl -s 'http://localhost:3000/api/calendar?team=<real-team-id>' | grep -E '^X-WR-CALNAME'
# Expected: X-WR-CALNAME:TCW: <season> - <team name>

curl -s 'http://localhost:3000/api/calendar?team=does-not-exist' | grep -E '^X-WR-CALNAME'
# Expected: X-WR-CALNAME:TCW-Kalender (does-not-exist)
```

Also check the `Content-Disposition` filename for one of the team calls:

```bash
curl -sI 'http://localhost:3000/api/calendar?team=<real-team-id>' | grep -i 'content-disposition'
# Expected filename like: tcw-sommer-2026-herren-40.ics
```

Replace `<real-team-id>` with an active team id from your local Directus/nuliga-reader data. If you don't know one, check one of the `<ICalButton>` instances on a team page in the running app.

- [ ] **Step 6: Commit**

```bash
git add apps/website/src/app/api/calendar/route.ts
git commit -m "feat(website): use team record for iCal feed name and shorten base name"
```

---

## Final Verification

- [ ] **Run the whole workspace build and test once more**

```bash
pnpm --filter @tcw/calendar build
pnpm --filter @tcw/website lint
pnpm --filter @tcw/website test
pnpm --filter @tcw/website build
```

All four commands should complete without errors.

- [ ] **Confirm spec coverage**

Against `docs/superpowers/specs/2026-04-16-ical-team-calendar-name.md`:

- "Base name: `TCW-Kalender`" → Task 2 (helper) + Task 3 (route uses helper).
- "Team filter uses `TCW: {season} - {team name}` from the team record" → Task 2 (helper test + code) + Task 3 (route fetches teams).
- "Team filter applies regardless of category" → Task 2 test `uses the team-specific name even when a category is also set`.
- "Team not found falls back to `TCW-Kalender ({teamId})`" → Task 2 test `falls back to the base name with the team id` + Task 3 (resolvedTeam is null when not found).
- "`fetchNrTeams` / `NrTeam` exposed from `@tcw/calendar`" → Task 1.
- "Filename sanitization unchanged" → no code change; verified in Task 3 smoke test.
- "Category-only and no-filter behavior unchanged" → Task 2 tests cover both.
