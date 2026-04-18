# Dispo Admin Home — Assignment Status Diagonal Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show assignment-completeness status on each day cell of the admin home calendar via a diagonal split, alongside the existing court-usage heatmap.

**Architecture:** Server reads per-match assignment counts from SQLite; a pure helper in `apps/dispo/src/lib/assignment-status.ts` combines those with the event list to produce a `Map<dateKey, AssignmentStatus>`. The existing `CourtUsageGrid` renders the split with two clip-path triangles using Tailwind color utilities.

**Tech Stack:** Next.js 16 (App Router, server components), React 19, TypeScript, Tailwind CSS 4, better-sqlite3, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-18-dispo-assignment-status-diagonal-design.md`

---

## File Map

- **Create** `apps/dispo/src/lib/assignment-status.ts` — `AssignmentStatus` type + `computeAssignmentStatusByDate(events, assignmentsByMatch)` pure function.
- **Create** `apps/dispo/src/lib/__tests__/assignment-status.test.ts` — unit tests for the pure function.
- **Modify** `apps/dispo/src/lib/assignments.ts` — add `getAssignmentCountsByMatchForYear(db, year)`.
- **Modify** `apps/dispo/src/lib/__tests__/assignments.test.ts` — tests for the new query.
- **Modify** `apps/dispo/src/app/page.tsx` — fetch the map, pass it down.
- **Modify** `apps/dispo/src/components/calendar/CourtUsageClient.tsx` — accept `assignmentsByMatch`, derive `statusByDate`, extend legend.
- **Modify** `apps/dispo/src/components/calendar/CourtUsageGrid.tsx` — accept `statusByDate`, render diagonal split.

---

## Task 1: Add `getAssignmentCountsByMatchForYear` query

**Files:**
- Modify: `apps/dispo/src/lib/assignments.ts`
- Test: `apps/dispo/src/lib/__tests__/assignments.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `apps/dispo/src/lib/__tests__/assignments.test.ts` inside the top-level `describe('assignments', ...)` block, after the `findConflicts` describe:

```ts
  describe('getAssignmentCountsByMatchForYear', () => {
    it('returns empty map when nothing stored', () => {
      expect(getAssignmentCountsByMatchForYear(db, 2026).size).toBe(0)
    })

    it('counts rows per match within the requested year only', () => {
      replaceAssignmentsForDate(db, '2026-04-18', [
        { matchId: 'm1', matchTime: '10:00', courtIds: [1, 2] },
        { matchId: 'm2', matchTime: '14:00', courtIds: [3] },
      ])
      replaceAssignmentsForDate(db, '2026-12-31', [
        { matchId: 'm3', matchTime: '10:00', courtIds: [1, 2, 3] },
      ])
      replaceAssignmentsForDate(db, '2025-12-31', [
        { matchId: 'm4', matchTime: '10:00', courtIds: [1] },
      ])
      replaceAssignmentsForDate(db, '2027-01-01', [
        { matchId: 'm5', matchTime: '10:00', courtIds: [1] },
      ])

      const map = getAssignmentCountsByMatchForYear(db, 2026)
      expect(map.get('m1')).toBe(2)
      expect(map.get('m2')).toBe(1)
      expect(map.get('m3')).toBe(3)
      expect(map.has('m4')).toBe(false)
      expect(map.has('m5')).toBe(false)
    })
  })
```

Also add the import:

```ts
import {
  findConflicts,
  getAssignmentCountsByMatchForYear,
  getAssignmentsForDate,
  replaceAssignmentsForDate,
  type AssignmentRow,
} from '../assignments'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tcw/dispo test -- assignments`
Expected: FAIL — `getAssignmentCountsByMatchForYear is not exported`.

- [ ] **Step 3: Implement the function**

Append to `apps/dispo/src/lib/assignments.ts`:

```ts
export function getAssignmentCountsByMatchForYear(
  db: Database.Database,
  year: number,
): Map<string, number> {
  const start = `${year}-01-01`
  const end = `${year}-12-31`
  const stmt = db.prepare(`
    SELECT match_id AS matchId, COUNT(*) AS count
    FROM assignments
    WHERE match_date BETWEEN ? AND ?
    GROUP BY match_id
  `)
  const rows = stmt.all(start, end) as Array<{ matchId: string; count: number }>
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.matchId, row.count)
  }
  return map
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tcw/dispo test -- assignments`
Expected: PASS — all `assignments` describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add apps/dispo/src/lib/assignments.ts apps/dispo/src/lib/__tests__/assignments.test.ts
git commit -m "feat(dispo): add getAssignmentCountsByMatchForYear query"
```

---

## Task 2: Create pure `computeAssignmentStatusByDate` helper

**Files:**
- Create: `apps/dispo/src/lib/assignment-status.ts`
- Test: `apps/dispo/src/lib/__tests__/assignment-status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/dispo/src/lib/__tests__/assignment-status.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { CalendarEvent, MatchEventMetadata } from '@tcw/calendar'
import { computeAssignmentStatusByDate } from '../assignment-status'

function matchEvent(
  id: string,
  dateKey: string,
  group: string,
  isHome = true,
): CalendarEvent {
  const [y, m, d] = dateKey.split('-').map(Number)
  const meta: MatchEventMetadata = {
    homeTeam: 'TCW 1',
    awayTeam: 'Opponent',
    league: group,
    leagueFull: group,
    group,
    isHome,
  }
  return {
    id,
    source: 'match',
    title: 'Match',
    description: null,
    location: null,
    startDate: new Date(y!, (m ?? 1) - 1, d ?? 1, 10, 0, 0),
    endDate: null,
    startTime: '10:00',
    endTime: null,
    isAllDay: false,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: meta,
    displayWeight: 1,
  }
}

function tournamentEvent(id: string, dateKey: string): CalendarEvent {
  const [y, m, d] = dateKey.split('-').map(Number)
  return {
    id,
    source: 'tournament',
    title: 'Vereinsmeisterschaft',
    description: null,
    location: null,
    startDate: new Date(y!, (m ?? 1) - 1, d ?? 1),
    endDate: null,
    startTime: null,
    endTime: null,
    isAllDay: true,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: {},
    displayWeight: 1,
  }
}

describe('computeAssignmentStatusByDate', () => {
  it('marks a day as "none" when every match has zero assignments', () => {
    const events = [matchEvent('m1', '2026-04-18', 'Bezirksliga')]
    const result = computeAssignmentStatusByDate(events, new Map())
    expect(result.get('2026-04-18')).toBe('none')
  })

  it('marks a day as "exact" when every match has exactly its needed courts', () => {
    const events = [
      matchEvent('m1', '2026-04-18', 'Bezirksliga'), // needs 3
      matchEvent('m2', '2026-04-18', 'Kids-Staffel'), // needs 2
    ]
    const assignments = new Map([
      ['m1', 3],
      ['m2', 2],
    ])
    const result = computeAssignmentStatusByDate(events, assignments)
    expect(result.get('2026-04-18')).toBe('exact')
  })

  it('marks a day as "over" when all matches are at or above need and at least one is above', () => {
    const events = [
      matchEvent('m1', '2026-04-18', 'Bezirksliga'), // needs 3
      matchEvent('m2', '2026-04-18', 'Kids-Staffel'), // needs 2
    ]
    const assignments = new Map([
      ['m1', 4],
      ['m2', 2],
    ])
    const result = computeAssignmentStatusByDate(events, assignments)
    expect(result.get('2026-04-18')).toBe('over')
  })

  it('marks as "partial" when one match is short even if another is over', () => {
    const events = [
      matchEvent('m1', '2026-04-18', 'Bezirksliga'), // needs 3
      matchEvent('m2', '2026-04-18', 'Bezirksliga'), // needs 3
    ]
    const assignments = new Map([
      ['m1', 4],
      ['m2', 1],
    ])
    const result = computeAssignmentStatusByDate(events, assignments)
    expect(result.get('2026-04-18')).toBe('partial')
  })

  it('marks as "partial" when one match has no assignments but total > 0', () => {
    const events = [
      matchEvent('m1', '2026-04-18', 'Bezirksliga'),
      matchEvent('m2', '2026-04-18', 'Bezirksliga'),
    ]
    const assignments = new Map([['m1', 3]])
    const result = computeAssignmentStatusByDate(events, assignments)
    expect(result.get('2026-04-18')).toBe('partial')
  })

  it('skips tournament-only days', () => {
    const events = [tournamentEvent('t1', '2026-06-10')]
    const result = computeAssignmentStatusByDate(events, new Map())
    expect(result.has('2026-06-10')).toBe(false)
  })

  it('skips days where a tournament is present alongside matches', () => {
    const events = [
      matchEvent('m1', '2026-06-10', 'Bezirksliga'),
      tournamentEvent('t1', '2026-06-10'),
    ]
    const assignments = new Map([['m1', 3]])
    const result = computeAssignmentStatusByDate(events, assignments)
    expect(result.has('2026-06-10')).toBe(false)
  })

  it('ignores away matches', () => {
    const events = [matchEvent('m1', '2026-04-18', 'Bezirksliga', false)]
    const result = computeAssignmentStatusByDate(events, new Map())
    expect(result.has('2026-04-18')).toBe(false)
  })

  it('does not create entries for days without home matches', () => {
    const result = computeAssignmentStatusByDate([], new Map())
    expect(result.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tcw/dispo test -- assignment-status`
Expected: FAIL — cannot find module `../assignment-status`.

- [ ] **Step 3: Implement the helper**

Create `apps/dispo/src/lib/assignment-status.ts`:

```ts
import {
  getCourtCount,
  getDateKey,
  isTournamentEvent,
  type CalendarEvent,
  type MatchEventMetadata,
} from '@tcw/calendar'

export type AssignmentStatus = 'none' | 'partial' | 'exact' | 'over'

interface DayAgg {
  hasTournament: boolean
  pairs: Array<{ needed: number; assigned: number }>
}

export function computeAssignmentStatusByDate(
  events: CalendarEvent[],
  assignmentsByMatch: Map<string, number>,
): Map<string, AssignmentStatus> {
  const byDay = new Map<string, DayAgg>()

  for (const event of events) {
    const dateKey = getDateKey(event.startDate)
    const agg = byDay.get(dateKey) ?? { hasTournament: false, pairs: [] }

    if (isTournamentEvent(event)) {
      agg.hasTournament = true
      byDay.set(dateKey, agg)
      continue
    }

    if (event.source !== 'match') continue
    const meta = event.metadata as MatchEventMetadata
    if (!meta.isHome) continue

    const league = meta.group || meta.leagueFull || meta.league || ''
    const needed = getCourtCount(league)
    const assigned = assignmentsByMatch.get(event.id) ?? 0

    agg.pairs.push({ needed, assigned })
    byDay.set(dateKey, agg)
  }

  const result = new Map<string, AssignmentStatus>()
  for (const [dateKey, agg] of byDay) {
    if (agg.hasTournament) continue
    if (agg.pairs.length === 0) continue

    const totalAssigned = agg.pairs.reduce((s, p) => s + p.assigned, 0)
    if (totalAssigned === 0) {
      result.set(dateKey, 'none')
      continue
    }
    const anyShort = agg.pairs.some((p) => p.assigned < p.needed)
    if (anyShort) {
      result.set(dateKey, 'partial')
      continue
    }
    const anyOver = agg.pairs.some((p) => p.assigned > p.needed)
    result.set(dateKey, anyOver ? 'over' : 'exact')
  }

  return result
}
```

Note: `getDateKey` is exported from `@tcw/calendar` (see `packages/calendar/src/index.ts` line 61). `getCourtCount` and `isTournamentEvent` are also exported from the package root.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tcw/dispo test -- assignment-status`
Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/dispo/src/lib/assignment-status.ts apps/dispo/src/lib/__tests__/assignment-status.test.ts
git commit -m "feat(dispo): pure helper for per-day assignment status"
```

---

## Task 3: Wire server data through `page.tsx`

**Files:**
- Modify: `apps/dispo/src/app/page.tsx`

- [ ] **Step 1: Read the current file**

Open `apps/dispo/src/app/page.tsx` and locate the `AdminHomePage` async function.

- [ ] **Step 2: Add the DB fetch + prop**

Replace the function body. New imports at the top of the file:

```ts
import { getAssignmentCountsByMatchForYear } from '@/lib/assignments'
import { getDb } from '@/lib/db'
```

Rewrite the component body to fetch assignments alongside the existing data and pass them through:

```ts
export default async function AdminHomePage() {
  const now = new Date()
  const year = now.getFullYear()
  const [eventsResult, courtsResult, changeGroups] = await Promise.all([
    settle(fetchAllEventsForYear(year)),
    settle(fetchCourts()),
    fetchMatchChangeGroups(now),
  ])

  const courts = courtsResult.ok ? courtsResult.data : []
  const indoor = courts.filter((c) => c.type === 'tennis_indoor').length
  const outdoor = courts.filter((c) => c.type === 'tennis_outdoor').length

  const assignmentsByMatch = getAssignmentCountsByMatchForYear(getDb(), year)

  return (
    <main className="mx-auto max-w-7xl p-6">
      <AdminHeader subtitle={`Übersicht ${year}`} />
      <p className="mb-6 text-sm text-muted">Auf einen Tag klicken, um Plätze zuzuweisen.</p>

      {!eventsResult.ok && <SourceErrorBanner source="events" />}
      {!courtsResult.ok && <SourceErrorBanner source="courts" />}

      {eventsResult.ok ? (
        <CourtUsageClient
          events={eventsResult.data}
          indoorCourtCount={indoor}
          outdoorCourtCount={outdoor}
          courtsUnavailable={!courtsResult.ok}
          assignmentsByMatch={Object.fromEntries(assignmentsByMatch)}
        />
      ) : null}

      <CourtUsageChanges groups={changeGroups} now={now} />
    </main>
  )
}
```

**Why `Object.fromEntries`:** `Map` instances don't serialize cleanly across the server/client boundary in Next App Router. We pass a plain object and reconstruct a `Map` in the client component.

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @tcw/dispo exec tsc --noEmit`
Expected: FAIL with `Property 'assignmentsByMatch' does not exist on type 'CourtUsageClientProps'.` (added in Task 4).

This is expected — we'll fix it in the next task. Move on without committing.

---

## Task 4: Extend `CourtUsageClient` with status map + legend

**Files:**
- Modify: `apps/dispo/src/components/calendar/CourtUsageClient.tsx`

- [ ] **Step 1: Update props + derive status**

Replace the file's contents with:

```tsx
'use client'

import { computeCourtUsage, type CalendarEvent } from '@tcw/calendar'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import {
  computeAssignmentStatusByDate,
  type AssignmentStatus,
} from '@/lib/assignment-status'
import { CourtUsageGrid } from './CourtUsageGrid'

interface CourtUsageClientProps {
  events: CalendarEvent[]
  indoorCourtCount: number
  outdoorCourtCount: number
  courtsUnavailable?: boolean
  assignmentsByMatch: Record<string, number>
}

export function CourtUsageClient({
  events,
  indoorCourtCount,
  outdoorCourtCount,
  courtsUnavailable = false,
  assignmentsByMatch,
}: CourtUsageClientProps) {
  const router = useRouter()

  const months = useMemo(
    () =>
      computeCourtUsage({
        events,
        indoorCourtCount,
        outdoorCourtCount,
        year: new Date().getFullYear(),
      }),
    [events, indoorCourtCount, outdoorCourtCount],
  )

  const statusByDate = useMemo<Map<string, AssignmentStatus>>(
    () =>
      courtsUnavailable
        ? new Map()
        : computeAssignmentStatusByDate(events, new Map(Object.entries(assignmentsByMatch))),
    [events, assignmentsByMatch, courtsUnavailable],
  )

  const handleDayClick = useCallback(
    (dateKey: string) => {
      router.push(`/day/${dateKey}`)
    },
    [router],
  )

  return (
    <div>
      {courtsUnavailable ? (
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted">
          <span>
            <strong>T</strong> = Turnier
          </span>
          <span>vorm.+nachm. Spiele</span>
        </div>
      ) : (
        <div className="mb-4 space-y-2 text-xs text-muted">
          <div className="flex flex-wrap gap-3">
            <span className="font-semibold text-body">Auslastung:</span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded bg-green-900/80" /> Niedrig
            </span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded bg-amber-900/80" /> Mittel
            </span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded bg-red-900/80" /> Hoch / Turnier
            </span>
            <span>
              vorm.+nachm. Plätze | <strong>T</strong> = Turnier
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="font-semibold text-body">Zuweisung:</span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded bg-red-900/80" /> Keine
            </span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded bg-orange-800/80" /> Unvollständig
            </span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded bg-green-800/80" /> Passt
            </span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded bg-emerald-500/70" /> Mehr als nötig
            </span>
          </div>
        </div>
      )}
      <CourtUsageGrid
        months={months}
        onDayClick={handleDayClick}
        neutral={courtsUnavailable}
        statusByDate={statusByDate}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @tcw/dispo exec tsc --noEmit`
Expected: FAIL — `Property 'statusByDate' does not exist on type 'CourtUsageGridProps'.` (fixed in Task 5).

---

## Task 5: Render diagonal split in `CourtUsageGrid`

**Files:**
- Modify: `apps/dispo/src/components/calendar/CourtUsageGrid.tsx`

- [ ] **Step 1: Replace the file**

Replace `apps/dispo/src/components/calendar/CourtUsageGrid.tsx` with:

```tsx
'use client'

import type { CourtUsageDay, CourtUsageMonth } from '@tcw/calendar'
import type { AssignmentStatus } from '@/lib/assignment-status'

interface CourtUsageGridProps {
  months: CourtUsageMonth[]
  onDayClick: (dateKey: string) => void
  neutral?: boolean
  statusByDate?: Map<string, AssignmentStatus>
}

const USAGE_BG = {
  low: 'bg-green-900/80',
  medium: 'bg-amber-900/80',
  high: 'bg-red-900/80',
} as const

const STATUS_BG: Record<AssignmentStatus, string> = {
  none: 'bg-red-900/80',
  partial: 'bg-orange-800/80',
  exact: 'bg-green-800/80',
  over: 'bg-emerald-500/70',
}

const USAGE_TEXT = {
  low: 'text-green-200',
  medium: 'text-amber-200',
  high: 'text-red-200',
} as const

const NEUTRAL_BG = 'bg-tcw-accent-800/60'
const NEUTRAL_TEXT = 'text-tcw-accent-200 dark:text-tcw-accent-100'

const WEEKDAY_HEADERS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function getWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function getSuperscript(day: CourtUsageDay): string {
  if (day.tournament) return 'T'
  return `${day.am.courts}+${day.pm.courts}`
}

function DayPill({
  dayNum,
  usageDay,
  status,
  neutral,
}: {
  dayNum: number
  usageDay: CourtUsageDay
  status: AssignmentStatus | undefined
  neutral: boolean
}) {
  if (neutral || !status) {
    const bg = neutral ? NEUTRAL_BG : USAGE_BG[usageDay.heatLevel]
    const text = neutral ? NEUTRAL_TEXT : USAGE_TEXT[usageDay.heatLevel]
    return (
      <span
        className={`inline-block min-w-[26px] rounded-md px-1 py-0.5 text-center text-sm font-medium ${bg} ${text}`}
      >
        {dayNum}
      </span>
    )
  }

  return (
    <span className="relative inline-block min-w-[26px] overflow-hidden rounded-md">
      <span
        aria-hidden
        className={`absolute inset-0 ${USAGE_BG[usageDay.heatLevel]}`}
        style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }}
      />
      <span
        aria-hidden
        className={`absolute inset-0 ${STATUS_BG[status]}`}
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
      />
      <span className="relative block px-1 py-0.5 text-center text-sm font-medium text-white">
        {dayNum}
      </span>
    </span>
  )
}

function MonthGrid({
  month,
  onDayClick,
  neutral,
  statusByDate,
}: {
  month: CourtUsageMonth
  onDayClick: (dateKey: string) => void
  neutral: boolean
  statusByDate: Map<string, AssignmentStatus>
}) {
  const year = month.monthDate.getFullYear()
  const monthIndex = month.monthDate.getMonth()
  const daysInMonth = getDaysInMonth(year, monthIndex)
  const firstDayOffset = getWeekdayIndex(new Date(year, monthIndex, 1))

  const dayLookup = new Map(month.days.map((d) => [d.dateKey, d]))

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }

  return (
    <div className="min-w-[240px]">
      <div className="mb-2 font-bold text-body">{formatMonthLabel(month.monthDate)}</div>
      <table className="w-full border-collapse font-mono text-sm">
        <thead>
          <tr>
            {WEEKDAY_HEADERS.map((h) => (
              <th key={h} className="p-1 text-center text-xs font-normal text-muted">
                {h}
              </th>
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
                const status = statusByDate.get(dateKey)
                return (
                  <td key={ci} className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => onDayClick(dateKey)}
                      className="relative inline-block cursor-pointer"
                    >
                      {usageDay ? (
                        <>
                          <DayPill
                            dayNum={dayNum}
                            usageDay={usageDay}
                            status={status}
                            neutral={neutral}
                          />
                          <span className="absolute -right-3 -top-2 text-[10px] font-bold text-body">
                            {getSuperscript(usageDay)}
                          </span>
                        </>
                      ) : (
                        <span className="inline-block min-w-[26px] px-1 py-0.5 text-center text-sm text-muted">
                          {dayNum}
                        </span>
                      )}
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

export function CourtUsageGrid({
  months,
  onDayClick,
  neutral = false,
  statusByDate,
}: CourtUsageGridProps) {
  const status = statusByDate ?? new Map<string, AssignmentStatus>()
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {months.map((month) => (
        <MonthGrid
          key={month.monthKey}
          month={month}
          onDayClick={onDayClick}
          neutral={neutral}
          statusByDate={status}
        />
      ))}
    </div>
  )
}
```

Notes:
- The `NEUTRAL_COLOR` constant was split into `NEUTRAL_BG` and `NEUTRAL_TEXT` to mirror the new structure.
- Tournament days still get no status entry (by design in Task 2), so they fall into the `!status` branch and render as today.
- Text color on split cells is `text-white` because the existing per-color text utilities don't work over both halves.

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @tcw/dispo exec tsc --noEmit`
Expected: PASS (exit 0).

- [ ] **Step 3: Run lint**

Run: `pnpm --filter @tcw/dispo lint`
Expected: PASS.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm --filter @tcw/dispo test`
Expected: PASS — all tests green, including the new ones from Tasks 1 and 2.

- [ ] **Step 5: Commit**

```bash
git add apps/dispo/src/app/page.tsx \
        apps/dispo/src/components/calendar/CourtUsageClient.tsx \
        apps/dispo/src/components/calendar/CourtUsageGrid.tsx
git commit -m "feat(dispo): diagonal split showing assignment status per day"
```

---

## Task 6: Smoke-test in the browser

**Files:** none

- [ ] **Step 1: Start the dev server**

Run (in a separate terminal): `mise run dev:dispo` (or `pnpm --filter @tcw/dispo dev`).

Visit http://localhost:3002. Log in with the operator password.

- [ ] **Step 2: Visual checks**

Confirm on the admin home:
- Day cells with home matches show a diagonal split (bottom-left = heat color, top-right = status color).
- Days without matches and tournament-only days show a single-color pill (or nothing for empty days).
- The legend shows two rows: "Auslastung" (existing) and "Zuweisung" (new) with four colors.
- Clicking a day still navigates to `/day/[date]`.

- [ ] **Step 3: Interact with assignments**

- Pick any day with matches, open `/day/[date]`, assign fewer courts than needed → back on home, that day's status-half should be **orange** (partial).
- Assign exactly the needed courts → status-half **green** (exact).
- Assign more than needed → status-half **light green** (over).
- Clear all assignments → status-half **red** (none).
- If a day has both a tournament and a match, no split should be rendered.

- [ ] **Step 4: If everything looks right, stop**

No further commit needed — this is a verification task. If something is off, capture the screenshot and iterate.

---

## Verification summary

After completing all tasks:

1. `pnpm --filter @tcw/dispo test` — all green (existing + new `assignments`, `assignment-status` suites).
2. `pnpm --filter @tcw/dispo exec tsc --noEmit` — clean.
3. `pnpm --filter @tcw/dispo lint` — clean.
4. Manual browser smoke-test from Task 6.
