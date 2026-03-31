# Court Usage Calendar Block Style — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `court_usage` style to `BlockClubCalendar` that shows a heat map grid of court demand from home matches and tournaments, with drill-down detail and a printable list.

**Architecture:** A pure utility in `packages/calendar` computes court usage data from existing `CalendarEvent[]` + Directus court counts. A new `CourtUsageClient` client component renders the interactive grid/detail/print views. The server component fetches courts alongside events when `style === 'court_usage'`.

**Tech Stack:** React 19, Next.js 16, TypeScript, Tailwind CSS 4, Vitest, `@tcw/calendar` package

**Spec:** `docs/superpowers/specs/2026-03-30-court-usage-calendar-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `packages/calendar/src/court-usage.ts` | Pure court usage computation logic |
| Create | `packages/calendar/src/__tests__/court-usage.test.ts` | Unit tests for computation |
| Modify | `packages/calendar/src/index.ts` | Export new types and functions |
| Modify | `apps/website/src/types/directus-schema.ts:91` | Add `court_usage` to style union |
| Modify | `apps/website/src/components/blocks/BlockClubCalendar/index.tsx` | Fetch courts, render CourtUsageClient |
| Create | `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageClient.tsx` | Client component: state, toggle, drill-down |
| Create | `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageGrid.tsx` | 12-month heat map grid |
| Create | `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageMonthDetail.tsx` | Expanded month list view |
| Create | `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageDayDetail.tsx` | Single day detail with AM/PM groups |
| Create | `apps/website/src/components/blocks/BlockClubCalendar/CourtUsagePrintView.tsx` | Print-only continuous list |

---

## Task 1: Court Usage Utility — Helper Functions

**Files:**
- Create: `packages/calendar/src/court-usage.ts`
- Create: `packages/calendar/src/__tests__/court-usage.test.ts`

- [ ] **Step 1: Write failing tests for helper functions**

```ts
// packages/calendar/src/__tests__/court-usage.test.ts
import { describe, it, expect } from 'vitest'
import {
  getCourtCount,
  getPlayerCount,
  getSeasonCourtType,
  getHeatLevel,
} from '../court-usage'

describe('getCourtCount', () => {
  it('returns 2 for league names containing "staffel" (case-insensitive)', () => {
    expect(getCourtCount('Herren 50 Staffel')).toBe(2)
    expect(getCourtCount('DAMEN STAFFEL')).toBe(2)
    expect(getCourtCount('Bezirksstaffel')).toBe(2)
  })

  it('returns 2 for league names containing "kids" (case-insensitive)', () => {
    expect(getCourtCount('Kids Cup')).toBe(2)
    expect(getCourtCount('KIDS')).toBe(2)
  })

  it('returns 2 for league names containing "talentiade" (case-insensitive)', () => {
    expect(getCourtCount('Talentiade U12')).toBe(2)
    expect(getCourtCount('talentiade')).toBe(2)
  })

  it('returns 3 for all other league names', () => {
    expect(getCourtCount('Herren')).toBe(3)
    expect(getCourtCount('Damen 40')).toBe(3)
    expect(getCourtCount('Junioren U18')).toBe(3)
  })
})

describe('getPlayerCount', () => {
  it('returns 8 for 2 courts', () => {
    expect(getPlayerCount(2)).toBe(8)
  })

  it('returns 12 for 3 courts', () => {
    expect(getPlayerCount(3)).toBe(12)
  })
})

describe('getSeasonCourtType', () => {
  it('returns tennis_indoor for winter dates (Sep 23 - Apr 30)', () => {
    expect(getSeasonCourtType(new Date(2026, 8, 23))).toBe('tennis_indoor')  // Sep 23
    expect(getSeasonCourtType(new Date(2026, 11, 15))).toBe('tennis_indoor') // Dec 15
    expect(getSeasonCourtType(new Date(2027, 0, 1))).toBe('tennis_indoor')   // Jan 1
    expect(getSeasonCourtType(new Date(2027, 3, 30))).toBe('tennis_indoor')  // Apr 30
  })

  it('returns tennis_outdoor for summer dates (May 1 - Sep 22)', () => {
    expect(getSeasonCourtType(new Date(2026, 4, 1))).toBe('tennis_outdoor')  // May 1
    expect(getSeasonCourtType(new Date(2026, 6, 15))).toBe('tennis_outdoor') // Jul 15
    expect(getSeasonCourtType(new Date(2026, 8, 22))).toBe('tennis_outdoor') // Sep 22
  })
})

describe('getHeatLevel', () => {
  it('returns low when less than 33% of courts used', () => {
    expect(getHeatLevel(1, 7)).toBe('low')   // 14%
    expect(getHeatLevel(2, 7)).toBe('low')   // 28%
  })

  it('returns medium when 33-66% of courts used', () => {
    expect(getHeatLevel(3, 7)).toBe('medium') // 42%
    expect(getHeatLevel(4, 7)).toBe('medium') // 57%
  })

  it('returns high when more than 66% of courts used', () => {
    expect(getHeatLevel(5, 7)).toBe('high')  // 71%
    expect(getHeatLevel(7, 7)).toBe('high')  // 100%
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/calendar && npx vitest run src/__tests__/court-usage.test.ts`
Expected: FAIL — cannot find module `../court-usage`

- [ ] **Step 3: Implement helper functions**

```ts
// packages/calendar/src/court-usage.ts

const SMALL_TEAM_PATTERNS = [/staffel/i, /kids/i, /talentiade/i]

/**
 * Determine courts needed based on league/group name.
 * Names containing "staffel", "kids", or "talentiade" need 2 courts, others need 3.
 */
export function getCourtCount(leagueName: string): number {
  return SMALL_TEAM_PATTERNS.some((p) => p.test(leagueName)) ? 2 : 3
}

/**
 * Derive player count from court count.
 * 2 courts = 8 players (4+4), 3 courts = 12 players (6+6).
 */
export function getPlayerCount(courts: number): number {
  return courts * 4
}

/**
 * Determine court type based on date.
 * Winter (Sep 23 – Apr 30) = indoor, Summer (May 1 – Sep 22) = outdoor.
 */
export function getSeasonCourtType(date: Date): 'tennis_indoor' | 'tennis_outdoor' {
  const month = date.getMonth() // 0-indexed
  const day = date.getDate()

  // May 1 (month 4) through Sep 22 (month 8, day 22) = outdoor
  if (month >= 4 && month <= 7) return 'tennis_outdoor'           // May–Aug always outdoor
  if (month === 8 && day <= 22) return 'tennis_outdoor'           // Sep 1–22 outdoor
  return 'tennis_indoor'                                           // Sep 23–Apr 30 indoor
}

/**
 * Determine heat level based on court usage percentage.
 * <33% = low, 33-66% = medium, >66% = high.
 */
export function getHeatLevel(
  courtsUsed: number,
  courtsAvailable: number
): 'low' | 'medium' | 'high' {
  if (courtsAvailable === 0) return 'high'
  const ratio = courtsUsed / courtsAvailable
  if (ratio > 0.66) return 'high'
  if (ratio >= 0.33) return 'medium'
  return 'low'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/calendar && npx vitest run src/__tests__/court-usage.test.ts`
Expected: All 12 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/calendar/src/court-usage.ts packages/calendar/src/__tests__/court-usage.test.ts
git commit -m "feat(calendar): add court usage helper functions with tests"
```

---

## Task 2: Court Usage Utility — `computeCourtUsage` Function

**Files:**
- Modify: `packages/calendar/src/court-usage.ts`
- Modify: `packages/calendar/src/__tests__/court-usage.test.ts`

- [ ] **Step 1: Write failing tests for `computeCourtUsage`**

Append to `packages/calendar/src/__tests__/court-usage.test.ts`:

```ts
import {
  getCourtCount,
  getPlayerCount,
  getSeasonCourtType,
  getHeatLevel,
  computeCourtUsage,
} from '../court-usage'
import type { CalendarEvent, MatchEventMetadata, TournamentEventMetadata } from '../types'

function makeMatchEvent(overrides: Partial<CalendarEvent> = {}, meta: Partial<MatchEventMetadata> = {}): CalendarEvent {
  return {
    id: '1',
    source: 'match',
    title: 'Match',
    description: null,
    location: null,
    startDate: new Date(2026, 9, 10), // Oct 10 (winter)
    endDate: null,
    startTime: '14:00',
    endTime: '18:00',
    isAllDay: false,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: {
      homeTeam: 'TC Waiblingen',
      awayTeam: 'TC Stuttgart',
      league: 'Herren',
      isHome: true,
      ...meta,
    } as MatchEventMetadata,
    displayWeight: 2,
    ...overrides,
  }
}

function makeTournamentEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 't1',
    source: 'tournament',
    title: 'Vereinsmeisterschaften',
    description: null,
    location: null,
    startDate: new Date(2026, 10, 14), // Nov 14 (winter)
    endDate: null,
    startTime: '09:00',
    endTime: '18:00',
    isAllDay: false,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: {} as TournamentEventMetadata,
    displayWeight: 2,
    ...overrides,
  }
}

describe('computeCourtUsage', () => {
  const config = { indoorCourtCount: 4, outdoorCourtCount: 7 }

  it('filters to only home matches', () => {
    const events = [
      makeMatchEvent({ id: 'home' }, { isHome: true }),
      makeMatchEvent({ id: 'away' }, { isHome: false }),
    ]
    const result = computeCourtUsage({ events, ...config })
    const day = result[0].days[0]
    expect(day.pm.entries).toHaveLength(1)
    expect(day.pm.entries[0].opponent).toBe('TC Stuttgart')
  })

  it('groups matches into AM and PM by start time', () => {
    const events = [
      makeMatchEvent({ id: 'am', startTime: '10:00' }, { league: 'Herren' }),
      makeMatchEvent({ id: 'pm', startTime: '14:00' }, { league: 'Damen' }),
    ]
    const result = computeCourtUsage({ events, ...config })
    const day = result[0].days[0]
    expect(day.am.entries).toHaveLength(1)
    expect(day.pm.entries).toHaveLength(1)
  })

  it('applies court count rules based on league name', () => {
    const events = [
      makeMatchEvent({ id: 'staffel', startTime: '14:00' }, { league: 'Herren 50 Staffel' }),
      makeMatchEvent({ id: 'normal', startTime: '14:00', startDate: new Date(2026, 9, 11) }, { league: 'Herren' }),
    ]
    const result = computeCourtUsage({ events, ...config })
    // staffel match
    const day1 = result[0].days[0]
    expect(day1.pm.entries[0].courts).toBe(2)
    expect(day1.pm.entries[0].players).toBe(8)
    // normal match
    const day2 = result[0].days[1]
    expect(day2.pm.entries[0].courts).toBe(3)
    expect(day2.pm.entries[0].players).toBe(12)
  })

  it('computes AM/PM court and team totals', () => {
    const events = [
      makeMatchEvent({ id: '1', startTime: '10:00' }, { league: 'Herren' }),
      makeMatchEvent({ id: '2', startTime: '14:00' }, { league: 'Herren 50 Staffel' }),
      makeMatchEvent({ id: '3', startTime: '15:00' }, { league: 'Damen 40' }),
    ]
    const result = computeCourtUsage({ events, ...config })
    const day = result[0].days[0]
    expect(day.am.courts).toBe(3)
    expect(day.am.teams).toBe(1)
    expect(day.am.players).toBe(12)
    expect(day.pm.courts).toBe(5) // 2 + 3
    expect(day.pm.teams).toBe(2)
    expect(day.pm.players).toBe(20) // 8 + 12
  })

  it('handles tournaments — uses all courts for the season', () => {
    const events = [makeTournamentEvent()] // Nov 14 = winter = indoor
    const result = computeCourtUsage({ events, ...config })
    const day = result[0].days[0]
    expect(day.tournament).not.toBeNull()
    expect(day.tournament!.courts).toBe(4) // all indoor courts
    expect(day.heatLevel).toBe('high')
  })

  it('assigns court type based on season', () => {
    const winterMatch = makeMatchEvent({ startDate: new Date(2026, 10, 5) }) // Nov = winter
    const summerMatch = makeMatchEvent({ id: '2', startDate: new Date(2026, 5, 15) }) // Jun = summer
    const result = computeCourtUsage({ events: [winterMatch, summerMatch], ...config })
    expect(result.find((m) => m.monthKey === '2026-11')!.courtType).toBe('tennis_indoor')
    expect(result.find((m) => m.monthKey === '2026-06')!.courtType).toBe('tennis_outdoor')
  })

  it('assigns heat level based on percentage of available courts', () => {
    // 1 match with 3 courts out of 4 indoor = 75% = high
    const events = [makeMatchEvent({ startTime: '14:00' }, { league: 'Herren' })]
    const result = computeCourtUsage({ events, ...config })
    expect(result[0].days[0].heatLevel).toBe('high') // 3/4 = 75%
  })

  it('ignores non-match, non-tournament events', () => {
    const clubEvent: CalendarEvent = {
      id: 'club1',
      source: 'club',
      title: 'Vereinsfest',
      description: null,
      location: null,
      startDate: new Date(2026, 9, 10),
      endDate: null,
      startTime: '14:00',
      endTime: null,
      isAllDay: false,
      isMultiDay: false,
      url: null,
      imageUrl: null,
      metadata: { important: false, showOnTv: false },
      displayWeight: 2,
    }
    const result = computeCourtUsage({ events: [clubEvent], ...config })
    expect(result).toHaveLength(0)
  })

  it('sorts entries by time within AM/PM groups', () => {
    const events = [
      makeMatchEvent({ id: '1', startTime: '15:00' }, { league: 'Damen' }),
      makeMatchEvent({ id: '2', startTime: '13:00' }, { league: 'Herren' }),
    ]
    const result = computeCourtUsage({ events, ...config })
    const pm = result[0].days[0].pm
    expect(pm.entries[0].time).toBe('13:00')
    expect(pm.entries[1].time).toBe('15:00')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/calendar && npx vitest run src/__tests__/court-usage.test.ts`
Expected: FAIL — `computeCourtUsage` is not exported

- [ ] **Step 3: Implement types and `computeCourtUsage`**

Add to `packages/calendar/src/court-usage.ts` (after the existing helper functions):

```ts
import type { CalendarEvent, MatchEventMetadata } from './types'
import { getDateKey, getMonthKey } from './grouping'

export interface CourtUsageEntry {
  time: string
  courts: number
  players: number
  league: string
  teamName: string
  opponent: string
}

export interface TournamentUsageEntry {
  title: string
  courts: number
}

export interface CourtUsageHalf {
  courts: number
  teams: number
  players: number
  entries: CourtUsageEntry[]
}

export interface CourtUsageDay {
  dateKey: string
  date: Date
  courtType: 'tennis_indoor' | 'tennis_outdoor'
  totalCourtsAvailable: number
  am: CourtUsageHalf
  pm: CourtUsageHalf
  tournament: TournamentUsageEntry | null
  heatLevel: 'low' | 'medium' | 'high'
}

export interface CourtUsageMonth {
  monthKey: string
  monthDate: Date
  courtType: 'tennis_indoor' | 'tennis_outdoor'
  totalCourtsAvailable: number
  days: CourtUsageDay[]
}

export interface CourtUsageConfig {
  events: CalendarEvent[]
  indoorCourtCount: number
  outdoorCourtCount: number
}

function emptyHalf(): CourtUsageHalf {
  return { courts: 0, teams: 0, players: 0, entries: [] }
}

/**
 * Compute court usage data from calendar events and court counts.
 * Filters to home matches and tournaments, groups by month/day/AM-PM,
 * and assigns heat levels based on percentage of available courts.
 */
export function computeCourtUsage(config: CourtUsageConfig): CourtUsageMonth[] {
  const { events, indoorCourtCount, outdoorCourtCount } = config

  const daysMap = new Map<string, CourtUsageDay>()

  for (const event of events) {
    const courtType = getSeasonCourtType(event.startDate)
    const totalCourtsAvailable = courtType === 'tennis_indoor' ? indoorCourtCount : outdoorCourtCount
    const dateKey = getDateKey(event.startDate)

    if (event.source === 'tournament') {
      let day = daysMap.get(dateKey)
      if (!day) {
        day = {
          dateKey,
          date: new Date(event.startDate),
          courtType,
          totalCourtsAvailable,
          am: emptyHalf(),
          pm: emptyHalf(),
          tournament: null,
          heatLevel: 'high',
        }
        daysMap.set(dateKey, day)
      }
      day.tournament = { title: event.title, courts: totalCourtsAvailable }
      day.heatLevel = 'high'
      continue
    }

    if (event.source !== 'match') continue
    const meta = event.metadata as MatchEventMetadata
    if (!meta.isHome) continue

    const league = meta.leagueFull || meta.league || ''
    const courts = getCourtCount(league)
    const players = getPlayerCount(courts)
    const time = event.startTime || '00:00'
    const isAm = time < '12:00'

    const entry: CourtUsageEntry = {
      time,
      courts,
      players,
      league,
      teamName: meta.homeTeam,
      opponent: meta.awayTeam,
    }

    let day = daysMap.get(dateKey)
    if (!day) {
      day = {
        dateKey,
        date: new Date(event.startDate),
        courtType,
        totalCourtsAvailable,
        am: emptyHalf(),
        pm: emptyHalf(),
        tournament: null,
        heatLevel: 'low',
      }
      daysMap.set(dateKey, day)
    }

    const half = isAm ? day.am : day.pm
    half.entries.push(entry)
    half.courts += courts
    half.teams += 1
    half.players += players
  }

  // Sort entries within each half and compute heat levels
  for (const day of daysMap.values()) {
    day.am.entries.sort((a, b) => a.time.localeCompare(b.time))
    day.pm.entries.sort((a, b) => a.time.localeCompare(b.time))
    if (!day.tournament) {
      const totalCourts = day.am.courts + day.pm.courts
      day.heatLevel = getHeatLevel(totalCourts, day.totalCourtsAvailable)
    }
  }

  // Group days into months
  const monthsMap = new Map<string, CourtUsageMonth>()
  for (const day of daysMap.values()) {
    const monthKey = getMonthKey(day.date)
    let month = monthsMap.get(monthKey)
    if (!month) {
      month = {
        monthKey,
        monthDate: new Date(day.date.getFullYear(), day.date.getMonth(), 1),
        courtType: day.courtType,
        totalCourtsAvailable: day.totalCourtsAvailable,
        days: [],
      }
      monthsMap.set(monthKey, month)
    }
    month.days.push(day)
  }

  // Sort months by key, days by dateKey
  return Array.from(monthsMap.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((month) => ({
      ...month,
      days: month.days.sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    }))
}
```

Note: Add the `import` statements at the top of the file. The final file should have the imports at the top, then the helpers (`getCourtCount`, `getPlayerCount`, `getSeasonCourtType`, `getHeatLevel`), then the types, then `computeCourtUsage`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/calendar && npx vitest run src/__tests__/court-usage.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Export from package index**

Add to `packages/calendar/src/index.ts`:

```ts
// Court usage
export {
  computeCourtUsage,
  getCourtCount,
  getPlayerCount,
  getSeasonCourtType,
  getHeatLevel,
} from './court-usage'

export type {
  CourtUsageConfig,
  CourtUsageMonth,
  CourtUsageDay,
  CourtUsageHalf,
  CourtUsageEntry,
  TournamentUsageEntry,
} from './court-usage'
```

- [ ] **Step 6: Build the calendar package**

Run: `cd packages/calendar && pnpm run build`
Expected: Build succeeds, `dist/court-usage.js` and `dist/court-usage.d.ts` are generated

- [ ] **Step 7: Commit**

```bash
git add packages/calendar/src/court-usage.ts packages/calendar/src/__tests__/court-usage.test.ts packages/calendar/src/index.ts
git commit -m "feat(calendar): add computeCourtUsage with types and tests"
```

---

## Task 3: Update Directus Schema Types and Server Component

**Files:**
- Modify: `apps/website/src/types/directus-schema.ts:91`
- Modify: `apps/website/src/components/blocks/BlockClubCalendar/index.tsx`

- [ ] **Step 1: Add `court_usage` to the style union in directus-schema.ts**

In `apps/website/src/types/directus-schema.ts`, line 91, change:

```ts
style?: 'default' | 'list';
```

to:

```ts
style?: 'default' | 'list' | 'court_usage';
```

- [ ] **Step 2: Update the server component to fetch courts and render CourtUsageClient**

Replace the contents of `apps/website/src/components/blocks/BlockClubCalendar/index.tsx`:

```tsx
import type { BlockClubCalendar as BlockClubCalendarType } from '@/types/directus-schema'
import type { CalendarEvent, MatchEventMetadata } from '@tcw/calendar'
import { Section } from '@/components/elements/section'
import { fetchAllCalendarEvents } from '@/lib/directus/calendar-fetchers'
import { fetchCourtsWithSponsors } from '@/lib/directus/fetchers'
import { CalendarClient } from './CalendarClient'
import { CourtUsageClient } from './CourtUsageClient'
import type { GroupEntry } from './FilterControls'

interface BlockClubCalendarProps {
  data: BlockClubCalendarType
}

function getCalendarDateRange(): { from: Date; to: Date; now: Date } {
  const now = new Date()
  const currentYear = now.getFullYear()
  const from = new Date(currentYear, 0, 1)
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59)
  const twelveMonthsFromNow = new Date(now)
  twelveMonthsFromNow.setFullYear(twelveMonthsFromNow.getFullYear() + 1)
  const to = endOfYear > twelveMonthsFromNow ? endOfYear : twelveMonthsFromNow
  return { from, to, now }
}

function extractGroupEntries(events: CalendarEvent[]): GroupEntry[] {
  const seen = new Map<string, GroupEntry>()

  for (const event of events) {
    if (event.source === 'match') {
      const meta = event.metadata as MatchEventMetadata
      const league = meta.leagueFull || meta.league
      if (!league) continue
      const key = `${meta.season ?? ''}|${league}|${meta.district ?? ''}`
      if (!seen.has(key)) {
        const label = meta.district ? `${league} (${meta.district})` : league
        seen.set(key, { value: league, label, season: meta.season })
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label, 'de'))
}

export async function BlockClubCalendar({ data }: BlockClubCalendarProps) {
  const { id, headline, tagline, alignment, filter_category, style } = data

  const dateRange = getCalendarDateRange()
  const events = await fetchAllCalendarEvents(dateRange)

  if (style === 'court_usage') {
    const courts = await fetchCourtsWithSponsors()
    const indoorCourtCount = courts.filter((c) => c.type === 'tennis_indoor').length
    const outdoorCourtCount = courts.filter((c) => c.type === 'tennis_outdoor').length

    return (
      <Section headline={headline} eyebrow={tagline} alignment={alignment} editAttr={{ collection: 'block_club_calendar', item: String(id) }}>
        <CourtUsageClient
          events={events}
          indoorCourtCount={indoorCourtCount}
          outdoorCourtCount={outdoorCourtCount}
          serverNow={dateRange.now.getTime()}
        />
      </Section>
    )
  }

  const groupEntries = extractGroupEntries(events)
  const serverNow = dateRange.now.getTime()

  return (
    <Section headline={headline} eyebrow={tagline} alignment={alignment} editAttr={{ collection: 'block_club_calendar', item: String(id) }}>
      <CalendarClient
        events={events}
        groupEntries={groupEntries}
        serverNow={serverNow}
        filterCategory={filter_category ?? undefined}
        style={style ?? 'default'}
        alignment={alignment ?? 'left'}
      />
    </Section>
  )
}
```

- [ ] **Step 3: Create a stub CourtUsageClient so it compiles**

Create `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageClient.tsx`:

```tsx
'use client'

import type { CalendarEvent } from '@tcw/calendar'

interface CourtUsageClientProps {
  events: CalendarEvent[]
  indoorCourtCount: number
  outdoorCourtCount: number
  serverNow: number
}

export function CourtUsageClient({ events, indoorCourtCount, outdoorCourtCount, serverNow }: CourtUsageClientProps) {
  return <div>Court usage view — {events.length} events, {indoorCourtCount} indoor, {outdoorCourtCount} outdoor courts</div>
}
```

- [ ] **Step 4: Verify build**

Run: `cd apps/website && pnpm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/website/src/types/directus-schema.ts apps/website/src/components/blocks/BlockClubCalendar/index.tsx apps/website/src/components/blocks/BlockClubCalendar/CourtUsageClient.tsx
git commit -m "feat(website): wire up court_usage style with server-side court fetching"
```

---

## Task 4: Court Usage Grid Component

**Files:**
- Create: `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageGrid.tsx`

- [ ] **Step 1: Create the grid component**

```tsx
// apps/website/src/components/blocks/BlockClubCalendar/CourtUsageGrid.tsx
'use client'

import type { CourtUsageMonth, CourtUsageDay } from '@tcw/calendar'

interface CourtUsageGridProps {
  months: CourtUsageMonth[]
  mode: 'courts' | 'teams'
  onMonthClick: (monthKey: string) => void
  onDayClick: (dateKey: string) => void
}

const HEAT_COLORS = {
  low: 'bg-green-900/80 text-green-200',
  medium: 'bg-amber-900/80 text-amber-200',
  high: 'bg-red-900/80 text-red-200',
} as const

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function getWeekdayIndex(date: Date): number {
  // Convert JS day (0=Sun) to Mon-based (0=Mon)
  return (date.getDay() + 6) % 7
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function formatCourtTypeLabel(courtType: 'tennis_indoor' | 'tennis_outdoor'): string {
  return courtType === 'tennis_indoor' ? 'Halle' : 'Freiplätze'
}

function getSuperscript(day: CourtUsageDay, mode: 'courts' | 'teams'): string {
  if (day.tournament) return 'T'
  const am = mode === 'courts' ? day.am.courts : day.am.teams
  const pm = mode === 'courts' ? day.pm.courts : day.pm.teams
  return `${am}+${pm}`
}

function MonthGrid({ month, mode, onMonthClick, onDayClick }: {
  month: CourtUsageMonth
  mode: 'courts' | 'teams'
  onMonthClick: (monthKey: string) => void
  onDayClick: (dateKey: string) => void
}) {
  const year = month.monthDate.getFullYear()
  const monthIndex = month.monthDate.getMonth()
  const daysInMonth = getDaysInMonth(year, monthIndex)
  const firstDayOffset = getWeekdayIndex(new Date(year, monthIndex, 1))

  // Build lookup of days with data
  const dayLookup = new Map(month.days.map((d) => [d.dateKey, d]))

  // Build grid cells
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }

  return (
    <div className="min-w-[240px]">
      <button
        type="button"
        onClick={() => onMonthClick(month.monthKey)}
        className="mb-2 w-full cursor-pointer text-left font-bold text-body hover:underline"
      >
        {formatMonthLabel(month.monthDate)}{' '}
        <span className="text-xs font-normal text-muted">
          ({formatCourtTypeLabel(month.courtType)})
        </span>
      </button>
      <table className="w-full border-collapse font-mono text-sm">
        <thead>
          <tr>
            {WEEKDAY_HEADERS.map((h) => (
              <th key={h} className="p-1 text-center text-xs text-muted font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((dayNum, ci) => {
                if (dayNum === null) return <td key={ci} className="p-1" />

                const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                const usageDay = dayLookup.get(dateKey)

                if (!usageDay) {
                  return <td key={ci} className="p-1 text-center text-muted">{dayNum}</td>
                }

                return (
                  <td key={ci} className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => onDayClick(dateKey)}
                      className="relative inline-block cursor-pointer"
                    >
                      <span className={`inline-block min-w-[26px] rounded-md px-1 py-0.5 text-center text-sm font-medium ${HEAT_COLORS[usageDay.heatLevel]}`}>
                        {dayNum}
                      </span>
                      <span className="absolute -right-3 -top-2 text-[10px] font-bold text-body">
                        {getSuperscript(usageDay, mode)}
                      </span>
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CourtUsageGrid({ months, mode, onMonthClick, onDayClick }: CourtUsageGridProps) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {months.map((month) => (
        <MonthGrid
          key={month.monthKey}
          month={month}
          mode={mode}
          onMonthClick={onMonthClick}
          onDayClick={onDayClick}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/website && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/components/blocks/BlockClubCalendar/CourtUsageGrid.tsx
git commit -m "feat(website): add CourtUsageGrid heat map component"
```

---

## Task 5: Day Detail and Month Detail Components

**Files:**
- Create: `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageDayDetail.tsx`
- Create: `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageMonthDetail.tsx`

- [ ] **Step 1: Create the day detail component**

```tsx
// apps/website/src/components/blocks/BlockClubCalendar/CourtUsageDayDetail.tsx
'use client'

import type { CourtUsageDay, CourtUsageHalf } from '@tcw/calendar'

interface CourtUsageDayDetailProps {
  day: CourtUsageDay
  showDayHeader?: boolean
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

function formatCourtType(courtType: 'tennis_indoor' | 'tennis_outdoor'): string {
  return courtType === 'tennis_indoor' ? 'Halle' : 'Freiplätze'
}

function HalfSection({ label, half, courtTypeLabel }: { label: string; half: CourtUsageHalf; courtTypeLabel: string }) {
  if (half.entries.length === 0) return null

  return (
    <div className="mb-4">
      <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">{label}</div>
      {half.entries.map((entry, i) => (
        <div key={i} className="grid grid-cols-[50px_70px_65px_1fr] gap-2 border-b border-gray-100 py-1.5 text-sm dark:border-gray-800">
          <span className="font-bold tabular-nums text-body">{entry.time}</span>
          <span className="text-muted">{entry.courts} Pl. ({courtTypeLabel})</span>
          <span className="text-xs text-muted">{entry.players} Sp.</span>
          <span className="text-body">
            <span className="text-xs text-muted">{entry.league}</span>
            {' — '}
            {entry.teamName} <span className="text-muted">vs</span> {entry.opponent}
          </span>
        </div>
      ))}
    </div>
  )
}

export function CourtUsageDayDetail({ day, showDayHeader = true }: CourtUsageDayDetailProps) {
  const totalCourts = day.am.courts + day.pm.courts
  const totalTeams = day.am.teams + day.pm.teams
  const totalPlayers = day.am.players + day.pm.players
  const courtTypeLabel = formatCourtType(day.courtType)

  return (
    <div>
      {showDayHeader && (
        <div className="mb-3 border-b-2 border-gray-200 pb-2 dark:border-gray-700">
          <span className="text-lg font-bold text-body">{formatDate(day.date)}</span>
          <span className="ml-2 text-xs text-muted">
            {day.tournament
              ? `${courtTypeLabel} — Turnier (alle Plätze)`
              : `${courtTypeLabel} — ${totalCourts} Plätze belegt (${day.am.courts} AM + ${day.pm.courts} PM)`}
          </span>
        </div>
      )}

      {day.tournament ? (
        <div className="border-b border-gray-100 py-1.5 text-sm dark:border-gray-800">
          <span className="mr-2 inline-block rounded bg-red-900/80 px-1.5 py-0.5 text-[10px] font-bold text-red-200">TURNIER</span>
          {day.tournament.title} — alle {courtTypeLabel} belegt
        </div>
      ) : (
        <>
          <HalfSection label="Vormittag (AM)" half={day.am} courtTypeLabel={courtTypeLabel} />
          <HalfSection label="Nachmittag (PM)" half={day.pm} courtTypeLabel={courtTypeLabel} />
        </>
      )}

      {!day.tournament && (
        <div className="mt-3 flex flex-wrap gap-4 rounded-md bg-gray-50 px-3 py-2 text-xs text-muted dark:bg-gray-800/50">
          <span><strong className="text-body">{totalTeams}</strong> Heimmannschaften</span>
          <span><strong className="text-body">{totalCourts}</strong> Plätze belegt</span>
          <span><strong className="text-body">{totalPlayers}</strong> Spieler</span>
          <span>AM: <strong className="text-body">{day.am.courts} Pl.</strong> / <strong className="text-body">{day.am.players} Sp.</strong> | PM: <strong className="text-body">{day.pm.courts} Pl.</strong> / <strong className="text-body">{day.pm.players} Sp.</strong></span>
        </div>
      )}
    </div>
  )
}

// Exported for reuse in print view and month detail
export { formatShortDate, formatCourtType }
```

- [ ] **Step 2: Create the month detail component**

```tsx
// apps/website/src/components/blocks/BlockClubCalendar/CourtUsageMonthDetail.tsx
'use client'

import type { CourtUsageMonth } from '@tcw/calendar'
import { CourtUsageDayDetail, formatCourtType } from './CourtUsageDayDetail'

interface CourtUsageMonthDetailProps {
  month: CourtUsageMonth
  onDayClick: (dateKey: string) => void
  onBack: () => void
}

function formatMonthHeader(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export function CourtUsageMonthDetail({ month, onDayClick, onBack }: CourtUsageMonthDetailProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 cursor-pointer text-sm text-muted hover:text-body hover:underline"
      >
        ← Zurück zur Übersicht
      </button>
      <h3 className="mb-6 border-b-[3px] border-gray-900 pb-2 text-xl font-bold text-body dark:border-gray-100">
        {formatMonthHeader(month.monthDate)}{' '}
        <span className="text-sm font-normal text-muted">({formatCourtType(month.courtType)})</span>
      </h3>
      <div className="flex flex-col gap-6">
        {month.days.map((day) => (
          <button
            key={day.dateKey}
            type="button"
            onClick={() => onDayClick(day.dateKey)}
            className="cursor-pointer rounded-lg border border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
          >
            <CourtUsageDayDetail day={day} />
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd apps/website && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/components/blocks/BlockClubCalendar/CourtUsageDayDetail.tsx apps/website/src/components/blocks/BlockClubCalendar/CourtUsageMonthDetail.tsx
git commit -m "feat(website): add CourtUsageDayDetail and CourtUsageMonthDetail components"
```

---

## Task 6: Print View Component

**Files:**
- Create: `apps/website/src/components/blocks/BlockClubCalendar/CourtUsagePrintView.tsx`

- [ ] **Step 1: Create the print view component**

```tsx
// apps/website/src/components/blocks/BlockClubCalendar/CourtUsagePrintView.tsx
'use client'

import type { CourtUsageMonth } from '@tcw/calendar'
import { CourtUsageDayDetail, formatCourtType } from './CourtUsageDayDetail'

interface CourtUsagePrintViewProps {
  months: CourtUsageMonth[]
}

function formatMonthHeader(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export function CourtUsagePrintView({ months }: CourtUsagePrintViewProps) {
  return (
    <div className="hidden print:block">
      {months.map((month) => (
        <div key={month.monthKey} className="mb-8">
          <h2 className="mb-4 border-b-[3px] border-gray-900 pb-1 text-lg font-bold">
            {formatMonthHeader(month.monthDate)}{' '}
            <span className="text-sm font-normal text-gray-500">({formatCourtType(month.courtType)})</span>
          </h2>
          {month.days.length === 0 ? (
            <p className="text-sm text-gray-500">Keine Heimspiele oder Turniere</p>
          ) : (
            <div className="flex flex-col gap-4">
              {month.days.map((day) => (
                <CourtUsageDayDetail key={day.dateKey} day={day} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd apps/website && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/components/blocks/BlockClubCalendar/CourtUsagePrintView.tsx
git commit -m "feat(website): add CourtUsagePrintView for printable court usage list"
```

---

## Task 7: Wire Up CourtUsageClient with All Views

**Files:**
- Modify: `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageClient.tsx`

- [ ] **Step 1: Implement the full CourtUsageClient**

Replace the stub in `apps/website/src/components/blocks/BlockClubCalendar/CourtUsageClient.tsx`:

```tsx
'use client'

import { useState, useMemo } from 'react'
import type { CalendarEvent } from '@tcw/calendar'
import { computeCourtUsage } from '@tcw/calendar'
import { CourtUsageGrid } from './CourtUsageGrid'
import { CourtUsageMonthDetail } from './CourtUsageMonthDetail'
import { CourtUsageDayDetail } from './CourtUsageDayDetail'
import { CourtUsagePrintView } from './CourtUsagePrintView'

interface CourtUsageClientProps {
  events: CalendarEvent[]
  indoorCourtCount: number
  outdoorCourtCount: number
  serverNow: number
}

type View = { type: 'grid' } | { type: 'month'; monthKey: string } | { type: 'day'; monthKey: string; dateKey: string }

export function CourtUsageClient({ events, indoorCourtCount, outdoorCourtCount }: CourtUsageClientProps) {
  const [view, setView] = useState<View>({ type: 'grid' })
  const [mode, setMode] = useState<'courts' | 'teams'>('courts')

  const months = useMemo(
    () => computeCourtUsage({ events, indoorCourtCount, outdoorCourtCount }),
    [events, indoorCourtCount, outdoorCourtCount],
  )

  const selectedMonth = view.type !== 'grid'
    ? months.find((m) => m.monthKey === view.monthKey)
    : null

  const selectedDay = view.type === 'day' && selectedMonth
    ? selectedMonth.days.find((d) => d.dateKey === view.dateKey)
    : null

  return (
    <div>
      {/* Toggle + Print — visible on screen only */}
      <div className="mb-6 flex items-center gap-4 print:hidden">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setMode('courts')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${mode === 'courts' ? 'bg-white font-medium text-body shadow-sm dark:bg-gray-700' : 'text-muted'}`}
          >
            Platzbelegung
          </button>
          <button
            type="button"
            onClick={() => setMode('teams')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm ${mode === 'teams' ? 'bg-white font-medium text-body shadow-sm dark:bg-gray-700' : 'text-muted'}`}
          >
            Heimmannschaften
          </button>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="cursor-pointer rounded-md border border-gray-200 px-3 py-1.5 text-sm text-muted hover:text-body dark:border-gray-700"
        >
          Drucken
        </button>
      </div>

      {/* Legend — grid view only */}
      {view.type === 'grid' && (
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted print:hidden">
          <span><span className="mr-1 inline-block h-3 w-3 rounded bg-green-900/80" /> Niedrig</span>
          <span><span className="mr-1 inline-block h-3 w-3 rounded bg-amber-900/80" /> Mittel</span>
          <span><span className="mr-1 inline-block h-3 w-3 rounded bg-red-900/80" /> Hoch / Turnier</span>
          <span className="text-muted">
            {mode === 'courts' ? 'AM+PM Plätze' : 'AM+PM Mannschaften'} | <strong>T</strong> = Turnier
          </span>
        </div>
      )}

      {/* Interactive views — hidden in print */}
      <div className="print:hidden">
        {view.type === 'grid' && (
          <CourtUsageGrid
            months={months}
            mode={mode}
            onMonthClick={(monthKey) => setView({ type: 'month', monthKey })}
            onDayClick={(dateKey) => {
              const monthKey = dateKey.substring(0, 7)
              setView({ type: 'day', monthKey, dateKey })
            }}
          />
        )}

        {view.type === 'month' && selectedMonth && (
          <CourtUsageMonthDetail
            month={selectedMonth}
            onDayClick={(dateKey) => setView({ type: 'day', monthKey: view.monthKey, dateKey })}
            onBack={() => setView({ type: 'grid' })}
          />
        )}

        {view.type === 'day' && selectedDay && (
          <div>
            <button
              type="button"
              onClick={() => setView({ type: 'month', monthKey: view.monthKey })}
              className="mb-4 cursor-pointer text-sm text-muted hover:text-body hover:underline"
            >
              ← Zurück zum Monat
            </button>
            <CourtUsageDayDetail day={selectedDay} />
          </div>
        )}
      </div>

      {/* Print view — hidden on screen, shown in print */}
      <CourtUsagePrintView months={months} />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd apps/website && pnpm run build`
Expected: Build succeeds

- [ ] **Step 3: Verify lint**

Run: `cd apps/website && pnpm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/components/blocks/BlockClubCalendar/CourtUsageClient.tsx
git commit -m "feat(website): wire up CourtUsageClient with grid, detail, and print views"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Run all calendar package tests**

Run: `cd packages/calendar && pnpm run test`
Expected: All tests pass

- [ ] **Step 2: Run website tests**

Run: `cd apps/website && pnpm run test`
Expected: All tests pass

- [ ] **Step 3: Run full build**

Run: `pnpm run build`
Expected: Build succeeds for all packages and apps

- [ ] **Step 4: Run lint**

Run: `pnpm run lint`
Expected: No errors

- [ ] **Step 5: Commit any remaining fixes if needed**

If any test/build/lint issues were found and fixed:

```bash
git add -A
git commit -m "fix: resolve build/lint issues in court usage feature"
```
