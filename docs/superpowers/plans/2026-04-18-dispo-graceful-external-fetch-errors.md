# Graceful External Fetch Errors (dispo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When external data sources (Directus, nuliga) fail, the dispo admin app degrades gracefully with per-source German banners instead of a generic 500 page — each page renders whatever data loaded and hides only the parts that depend on the failed source.

**Architecture:** A `settle()` helper wraps each fetch and returns `{ ok, data } | { ok, error }`. Pages (`/`, `/day/[date]`, `/today`) call `Promise.all` of settled fetches and branch on `.ok`. A shared `SourceErrorBanner` renders the per-source copy. A new read-only `MatchList` covers the "courts failed but matches loaded" case on `/day` and `/today`. `CourtUsageClient` gains an optional `courtsUnavailable` prop that strips the colour scale.

**Tech Stack:** Next.js 16 server components, TypeScript 5.9, Tailwind CSS 4, Vitest.

Spec: `docs/superpowers/specs/2026-04-18-dispo-graceful-external-fetch-errors-design.md`

---

## File Structure

**Create:**
- `apps/dispo/src/lib/fetch-result.ts` — `settle()` helper + `FetchResult<T>` type.
- `apps/dispo/src/lib/__tests__/fetch-result.test.ts` — unit tests for `settle()`.
- `apps/dispo/src/lib/source-error-message.ts` — `sourceErrorMessage(source)` central copy map.
- `apps/dispo/src/lib/__tests__/source-error-message.test.ts` — unit tests for the copy map.
- `apps/dispo/src/components/SourceErrorBanner.tsx` — presentational banner, uses the copy map.
- `apps/dispo/src/components/MatchList.tsx` — read-only list of `DayMatch[]`, used when courts fail.

**Modify:**
- `apps/dispo/src/app/day/[date]/page.tsx` — switch to settled fetches, render banners/list.
- `apps/dispo/src/app/today/page.tsx` — same pattern.
- `apps/dispo/src/app/page.tsx` — same pattern for events + courts.
- `apps/dispo/src/components/calendar/CourtUsageClient.tsx` — accept `courtsUnavailable?: boolean` and forward.
- `apps/dispo/src/components/calendar/CourtUsageGrid.tsx` — when `neutral` prop is set, render cells without the heat colour scale.

---

## Task 1: `settle()` helper

**Files:**
- Create: `apps/dispo/src/lib/fetch-result.ts`
- Test:   `apps/dispo/src/lib/__tests__/fetch-result.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/dispo/src/lib/__tests__/fetch-result.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { settle } from '../fetch-result'

describe('settle', () => {
  const originalConsoleError = console.error
  afterEach(() => {
    console.error = originalConsoleError
  })

  it('returns ok result when the promise resolves', async () => {
    const result = await settle(Promise.resolve(42))
    expect(result).toEqual({ ok: true, data: 42 })
  })

  it('returns error result when the promise rejects', async () => {
    const err = new Error('boom')
    console.error = vi.fn()
    const result = await settle(Promise.reject(err))
    expect(result).toEqual({ ok: false, error: err })
  })

  it('logs the error via console.error on rejection', async () => {
    const err = new Error('boom')
    const spy = vi.fn()
    console.error = spy
    await settle(Promise.reject(err))
    expect(spy).toHaveBeenCalledWith('External fetch failed:', err)
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `pnpm --filter @tcw/dispo test -- fetch-result`
Expected: all three tests FAIL because `../fetch-result` cannot be resolved.

- [ ] **Step 3: Implement the helper**

Create `apps/dispo/src/lib/fetch-result.ts`:

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

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm --filter @tcw/dispo test -- fetch-result`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/dispo/src/lib/fetch-result.ts apps/dispo/src/lib/__tests__/fetch-result.test.ts
git commit -m "feat(dispo): add settle() helper for graceful fetch failures"
```

---

## Task 2: Source error-message map

**Files:**
- Create: `apps/dispo/src/lib/source-error-message.ts`
- Test:   `apps/dispo/src/lib/__tests__/source-error-message.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/dispo/src/lib/__tests__/source-error-message.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sourceErrorMessage, type ExternalSource } from '../source-error-message'

const SOURCES: ExternalSource[] = ['courts', 'matches', 'events', 'tournament']

describe('sourceErrorMessage', () => {
  it.each(SOURCES)('returns a non-empty block message for %s', (source) => {
    const msg = sourceErrorMessage(source, 'block')
    expect(msg.title.length).toBeGreaterThan(0)
    expect(msg.body.length).toBeGreaterThan(0)
  })

  it('returns a non-empty inline message for tournament', () => {
    const msg = sourceErrorMessage('tournament', 'inline')
    expect(msg.body.length).toBeGreaterThan(0)
    expect(msg.title).toBe('')
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `pnpm --filter @tcw/dispo test -- source-error-message`
Expected: tests FAIL because `../source-error-message` cannot be resolved.

- [ ] **Step 3: Implement the map**

Create `apps/dispo/src/lib/source-error-message.ts`:

```ts
export type ExternalSource = 'courts' | 'matches' | 'events' | 'tournament'
export type BannerVariant = 'block' | 'inline'

export interface SourceErrorCopy {
  title: string
  body: string
}

const BLOCK: Record<ExternalSource, SourceErrorCopy> = {
  courts: {
    title: 'Plätze nicht verfügbar.',
    body: 'Directus ist derzeit nicht erreichbar — Zuweisung aktuell nicht möglich.',
  },
  matches: {
    title: 'Spiele nicht verfügbar.',
    body: 'Spielplan-Quelle ist derzeit nicht erreichbar.',
  },
  events: {
    title: 'Kalender nicht verfügbar.',
    body: 'Spiel- und Vereinstermine konnten nicht geladen werden.',
  },
  tournament: {
    title: 'Turnier-Status unbekannt.',
    body: 'Turnier-Information konnte nicht geladen werden.',
  },
}

const INLINE: Partial<Record<ExternalSource, SourceErrorCopy>> = {
  tournament: {
    title: '',
    body: 'Turnier-Status konnte nicht geprüft werden.',
  },
}

export function sourceErrorMessage(source: ExternalSource, variant: BannerVariant = 'block'): SourceErrorCopy {
  if (variant === 'inline') {
    const inline = INLINE[source]
    if (inline) return inline
  }
  return BLOCK[source]
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm --filter @tcw/dispo test -- source-error-message`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/dispo/src/lib/source-error-message.ts apps/dispo/src/lib/__tests__/source-error-message.test.ts
git commit -m "feat(dispo): add centralised source-error copy map"
```

---

## Task 3: `SourceErrorBanner` component

**Files:**
- Create: `apps/dispo/src/components/SourceErrorBanner.tsx`

No test (pure presentational; verified manually + via page consumers).

- [ ] **Step 1: Implement the component**

Create `apps/dispo/src/components/SourceErrorBanner.tsx`:

```tsx
import { sourceErrorMessage, type BannerVariant, type ExternalSource } from '@/lib/source-error-message'

interface SourceErrorBannerProps {
  source: ExternalSource
  variant?: BannerVariant
}

export function SourceErrorBanner({ source, variant = 'block' }: SourceErrorBannerProps) {
  const copy = sourceErrorMessage(source, variant)

  if (variant === 'inline') {
    return (
      <p className="mb-3 text-sm text-muted">
        {copy.body}
      </p>
    )
  }

  return (
    <div
      role="alert"
      className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
    >
      <strong>{copy.title}</strong> {copy.body}
    </div>
  )
}
```

- [ ] **Step 2: Verify the component type-checks**

Run: `pnpm --filter @tcw/dispo lint`
Expected: no lint errors touching the new file.

- [ ] **Step 3: Commit**

```bash
git add apps/dispo/src/components/SourceErrorBanner.tsx
git commit -m "feat(dispo): add SourceErrorBanner component"
```

---

## Task 4: Read-only `MatchList` component

**Files:**
- Create: `apps/dispo/src/components/MatchList.tsx`

- [ ] **Step 1: Implement the component**

Create `apps/dispo/src/components/MatchList.tsx`:

```tsx
import type { DayMatch } from '@/lib/matches'

interface MatchListProps {
  matches: DayMatch[]
}

export function MatchList({ matches }: MatchListProps) {
  if (matches.length === 0) {
    return (
      <p className="rounded-md border border-tcw-accent-200 bg-tcw-accent-50 px-4 py-3 text-muted dark:border-tcw-accent-800 dark:bg-tcw-accent-900/30">
        Keine Heimspiele an diesem Tag.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-tcw-accent-200 rounded-md border border-tcw-accent-200 dark:divide-tcw-accent-800 dark:border-tcw-accent-800">
      {matches.map((m) => (
        <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2 text-sm">
          <span className="font-mono tabular-nums text-body">{m.startTime}</span>
          <span className="text-body">
            {m.homeTeam} <span className="text-muted">vs</span> {m.opponent}
          </span>
          {m.leagueShort ? <span className="ml-auto text-xs text-muted">{m.leagueShort}</span> : null}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Verify type-checks**

Run: `pnpm --filter @tcw/dispo lint`
Expected: no lint errors.

- [ ] **Step 3: Commit**

```bash
git add apps/dispo/src/components/MatchList.tsx
git commit -m "feat(dispo): add read-only MatchList component"
```

---

## Task 5: Graceful errors on `/day/[date]`

**Files:**
- Modify: `apps/dispo/src/app/day/[date]/page.tsx`

- [ ] **Step 1: Replace the page implementation**

Replace the full contents of `apps/dispo/src/app/day/[date]/page.tsx` with:

```tsx
import { AdminHeader } from '@/components/AdminHeader'
import { AssignmentForm } from '@/components/AssignmentForm'
import { MatchList } from '@/components/MatchList'
import { SourceErrorBanner } from '@/components/SourceErrorBanner'
import { getAssignmentsForDate } from '@/lib/assignments'
import { getDb } from '@/lib/db'
import { fetchCourts } from '@/lib/directus/courts'
import { settle } from '@/lib/fetch-result'
import { formatCourtType, formatDateLong, parseIsoDate } from '@/lib/format'
import { fetchMatchesForDate, fetchTournamentForDate } from '@/lib/matches'
import { getSeasonCourtType } from '@tcw/calendar'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface DayPageProps {
  params: Promise<{ date: string }>
}

export default async function DayPage({ params }: DayPageProps) {
  const { date: dateParam } = await params
  const date = parseIsoDate(dateParam)
  if (!date) notFound()

  const [matchesResult, tournamentResult, courtsResult] = await Promise.all([
    settle(fetchMatchesForDate(date)),
    settle(fetchTournamentForDate(date)),
    settle(fetchCourts()),
  ])

  const courtType = getSeasonCourtType(date)
  const courts = courtsResult.ok ? courtsResult.data : []
  const seasonCourts = courts.filter((c) => c.type === courtType)
  const matches = matchesResult.ok ? matchesResult.data : []
  const tournament = tournamentResult.ok ? tournamentResult.data : null

  const stored = getAssignmentsForDate(getDb(), dateParam)
  const initialSelections: Record<string, number[]> = {}
  for (const row of stored) {
    if (!initialSelections[row.matchId]) initialSelections[row.matchId] = []
    initialSelections[row.matchId]!.push(row.courtId)
  }

  const subtitle = courtsResult.ok
    ? `${formatDateLong(date)} — ${formatCourtType(courtType)} (${seasonCourts.length} verfügbar)`
    : `${formatDateLong(date)} — ${formatCourtType(courtType)}`

  return (
    <main className="mx-auto max-w-7xl p-6">
      <AdminHeader subtitle={subtitle} />

      {!tournamentResult.ok && <SourceErrorBanner source="tournament" variant="inline" />}

      {tournamentResult.ok && tournament ? (
        <div className="mb-4 rounded-md border border-tcw-red-200 bg-tcw-red-50 px-4 py-3 text-tcw-red-900 dark:border-tcw-red-700 dark:bg-tcw-red-900/30 dark:text-tcw-red-50">
          <strong>Turnier:</strong>{' '}
          {tournament.url ? (
            <a href={tournament.url} target="_blank" rel="noopener noreferrer nofollow" className="cursor-pointer underline">
              {tournament.title}
            </a>
          ) : (
            tournament.title
          )}{' '}
          — alle Plätze belegt. Keine manuelle Zuweisung nötig.
        </div>
      ) : null}

      {!matchesResult.ok && <SourceErrorBanner source="matches" />}
      {!courtsResult.ok && <SourceErrorBanner source="courts" />}

      {matchesResult.ok && courtsResult.ok && !(tournamentResult.ok && tournament) ? (
        matches.length === 0 ? (
          <div className="rounded-md border border-tcw-accent-200 bg-tcw-accent-50 px-4 py-3 text-muted dark:border-tcw-accent-800 dark:bg-tcw-accent-900/30">
            Keine Heimspiele an diesem Tag.
          </div>
        ) : seasonCourts.length === 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            Keine {formatCourtType(courtType)} im System hinterlegt — Plätze in Directus pflegen.
          </div>
        ) : (
          <AssignmentForm date={dateParam} courts={seasonCourts} matches={matches} initialSelections={initialSelections} />
        )
      ) : null}

      {matchesResult.ok && !courtsResult.ok && !(tournamentResult.ok && tournament) ? (
        <MatchList matches={matches} />
      ) : null}
    </main>
  )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `pnpm --filter @tcw/dispo lint`
Expected: no errors in `day/[date]/page.tsx`.

- [ ] **Step 3: Build to confirm no TS errors**

Run: `pnpm --filter @tcw/dispo build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/dispo/src/app/day/[date]/page.tsx
git commit -m "feat(dispo): graceful per-source errors on /day/[date]"
```

---

## Task 6: Graceful errors on `/today`

**Files:**
- Modify: `apps/dispo/src/app/today/page.tsx`

- [ ] **Step 1: Replace the page implementation**

Replace the full contents of `apps/dispo/src/app/today/page.tsx` with:

```tsx
import { AssignmentTable } from '@/components/AssignmentTable'
import { MatchList } from '@/components/MatchList'
import { SourceErrorBanner } from '@/components/SourceErrorBanner'
import { getAssignmentsForDate } from '@/lib/assignments'
import { getDb } from '@/lib/db'
import { fetchCourts } from '@/lib/directus/courts'
import { settle } from '@/lib/fetch-result'
import { dateKey, formatCourtType, formatDateLong } from '@/lib/format'
import { fetchMatchesForDate, fetchTournamentForDate } from '@/lib/matches'
import { getSeasonCourtType } from '@tcw/calendar'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TodayPage() {
  const today = new Date()
  const todayKey = dateKey(today)

  const [matchesResult, tournamentResult, courtsResult] = await Promise.all([
    settle(fetchMatchesForDate(today)),
    settle(fetchTournamentForDate(today)),
    settle(fetchCourts()),
  ])

  const courtType = getSeasonCourtType(today)
  const courts = courtsResult.ok ? courtsResult.data : []
  const seasonCourts = courts.filter((c) => c.type === courtType)
  const matches = matchesResult.ok ? matchesResult.data : []
  const tournament = tournamentResult.ok ? tournamentResult.data : null

  const stored = getAssignmentsForDate(getDb(), todayKey)
  const selections: Record<string, number[]> = {}
  for (const row of stored) {
    if (!selections[row.matchId]) selections[row.matchId] = []
    selections[row.matchId]!.push(row.courtId)
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-6 border-b border-tcw-accent-200 pb-4 dark:border-tcw-accent-800">
        <h1 className="text-2xl font-bold text-body">Platzbelegung heute</h1>
        <p className="text-sm text-muted">{formatDateLong(today)} — {formatCourtType(courtType)}</p>
      </header>

      {!tournamentResult.ok && <SourceErrorBanner source="tournament" variant="inline" />}

      {tournamentResult.ok && tournament ? (
        <div className="mb-4 rounded-md border border-tcw-red-200 bg-tcw-red-50 px-4 py-3 text-tcw-red-900 dark:border-tcw-red-700 dark:bg-tcw-red-900/30 dark:text-tcw-red-50">
          <strong>Turnier:</strong> {tournament.title} — alle Plätze belegt.
        </div>
      ) : null}

      {!matchesResult.ok && <SourceErrorBanner source="matches" />}
      {!courtsResult.ok && <SourceErrorBanner source="courts" />}

      {matchesResult.ok && courtsResult.ok && !(tournamentResult.ok && tournament) ? (
        matches.length === 0 ? (
          <p className="rounded-md border border-tcw-accent-200 bg-tcw-accent-50 px-4 py-3 text-muted dark:border-tcw-accent-800 dark:bg-tcw-accent-900/30">
            Keine Heimspiele heute.
          </p>
        ) : stored.length === 0 ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            Plätze sind heute noch nicht zugewiesen.
          </p>
        ) : (
          <AssignmentTable courts={seasonCourts} matches={matches} selections={selections} />
        )
      ) : null}

      {matchesResult.ok && !courtsResult.ok && !(tournamentResult.ok && tournament) ? (
        <MatchList matches={matches} />
      ) : null}
    </main>
  )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `pnpm --filter @tcw/dispo lint`
Expected: no errors in `today/page.tsx`.

- [ ] **Step 3: Build**

Run: `pnpm --filter @tcw/dispo build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/dispo/src/app/today/page.tsx
git commit -m "feat(dispo): graceful per-source errors on /today"
```

---

## Task 7: `CourtUsageGrid` + `CourtUsageClient` neutral-gray mode

**Files:**
- Modify: `apps/dispo/src/components/calendar/CourtUsageGrid.tsx`
- Modify: `apps/dispo/src/components/calendar/CourtUsageClient.tsx`

- [ ] **Step 1: Update `CourtUsageGrid` to accept a neutral flag**

Replace the full contents of `apps/dispo/src/components/calendar/CourtUsageGrid.tsx` with:

```tsx
'use client'

import type { CourtUsageDay, CourtUsageMonth } from '@tcw/calendar'

interface CourtUsageGridProps {
  months: CourtUsageMonth[]
  onDayClick: (dateKey: string) => void
  neutral?: boolean
}

const HEAT_COLORS = {
  low: 'bg-green-900/80 text-green-200',
  medium: 'bg-amber-900/80 text-amber-200',
  high: 'bg-red-900/80 text-red-200',
} as const

const NEUTRAL_COLOR = 'bg-tcw-accent-800/60 text-tcw-accent-200 dark:bg-tcw-accent-700/60 dark:text-tcw-accent-100'

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

function MonthGrid({
  month,
  onDayClick,
  neutral,
}: {
  month: CourtUsageMonth
  onDayClick: (dateKey: string) => void
  neutral: boolean
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
                const colorClass = neutral ? NEUTRAL_COLOR : usageDay ? HEAT_COLORS[usageDay.heatLevel] : ''
                return (
                  <td key={ci} className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => onDayClick(dateKey)}
                      className="relative inline-block cursor-pointer"
                    >
                      {usageDay ? (
                        <>
                          <span
                            className={`inline-block min-w-[26px] rounded-md px-1 py-0.5 text-center text-sm font-medium ${colorClass}`}
                          >
                            {dayNum}
                          </span>
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

export function CourtUsageGrid({ months, onDayClick, neutral = false }: CourtUsageGridProps) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {months.map((month) => (
        <MonthGrid key={month.monthKey} month={month} onDayClick={onDayClick} neutral={neutral} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update `CourtUsageClient` to accept and forward `courtsUnavailable`**

Replace the full contents of `apps/dispo/src/components/calendar/CourtUsageClient.tsx` with:

```tsx
'use client'

import { computeCourtUsage, type CalendarEvent } from '@tcw/calendar'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { CourtUsageGrid } from './CourtUsageGrid'

interface CourtUsageClientProps {
  events: CalendarEvent[]
  indoorCourtCount: number
  outdoorCourtCount: number
  courtsUnavailable?: boolean
}

export function CourtUsageClient({
  events,
  indoorCourtCount,
  outdoorCourtCount,
  courtsUnavailable = false,
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
          <span>
            vorm.+nachm. Spiele
          </span>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted">
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
      )}
      <CourtUsageGrid months={months} onDayClick={handleDayClick} neutral={courtsUnavailable} />
    </div>
  )
}
```

- [ ] **Step 3: Type-check and lint**

Run: `pnpm --filter @tcw/dispo lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/dispo/src/components/calendar/CourtUsageGrid.tsx apps/dispo/src/components/calendar/CourtUsageClient.tsx
git commit -m "feat(dispo): neutral-gray mode for CourtUsageGrid when courts unavailable"
```

---

## Task 8: Graceful errors on `/`

**Files:**
- Modify: `apps/dispo/src/app/page.tsx`

- [ ] **Step 1: Replace the page implementation**

Replace the full contents of `apps/dispo/src/app/page.tsx` with:

```tsx
import { AdminHeader } from '@/components/AdminHeader'
import { CourtUsageClient } from '@/components/calendar/CourtUsageClient'
import { SourceErrorBanner } from '@/components/SourceErrorBanner'
import { fetchCourts } from '@/lib/directus/courts'
import { settle } from '@/lib/fetch-result'
import { fetchAllEventsForYear } from '@/lib/matches'

export const dynamic = 'force-dynamic'

export default async function AdminHomePage() {
  const year = new Date().getFullYear()
  const [eventsResult, courtsResult] = await Promise.all([
    settle(fetchAllEventsForYear(year)),
    settle(fetchCourts()),
  ])

  const courts = courtsResult.ok ? courtsResult.data : []
  const indoor = courts.filter((c) => c.type === 'tennis_indoor').length
  const outdoor = courts.filter((c) => c.type === 'tennis_outdoor').length

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
        />
      ) : null}
    </main>
  )
}
```

- [ ] **Step 2: Type-check and lint**

Run: `pnpm --filter @tcw/dispo lint`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `pnpm --filter @tcw/dispo build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/dispo/src/app/page.tsx
git commit -m "feat(dispo): graceful per-source errors on admin home"
```

---

## Task 9: Full local verification

**Files:** none (verification task).

- [ ] **Step 1: Run the dispo check pipeline**

Run: `mise run check:dispo`
Expected: lint, tests, and build all pass.

- [ ] **Step 2: Happy-path manual smoke**

Start the dev server with a valid `.env`:

Run: `mise run dev:dispo`

In a browser, visit:
- `http://localhost:3002/`
- `http://localhost:3002/day/2026-05-02` (or any date with known home matches)
- `http://localhost:3002/today`

Expected: all three render as before — heat-map coloured, day page with form, today page with table or empty-state message. No regressions.

- [ ] **Step 3: Simulate Directus outage**

Stop the dev server. Temporarily set `DIRECTUS_TOKEN=invalid` in `apps/dispo/.env` and restart `mise run dev:dispo`.

Visit the same three URLs. Expected:

- `/` — amber `courts` banner above the heat-map; heat-map renders in neutral gray (day cells still clickable); legend shows only the `T` / counts hint.
- `/day/<date>` — amber `courts` banner; matches rendered as a read-only list (no form); tournament banner renders if the tournament fetch still succeeded, otherwise tournament inline note may appear.
- `/today` — amber `courts` banner; matches rendered as read-only list (no assignment table).

No 500 page, no "Etwas ist schiefgelaufen".

- [ ] **Step 4: Simulate nuliga outage**

Stop the dev server. Restore `DIRECTUS_TOKEN`. Set `NR_API_TOKEN=invalid`. Restart.

Visit the same URLs. Expected:

- `/` — amber `events` banner; no heat-map (courts count still shown if available via the legend).
- `/day/<date>` — amber `matches` banner; no list, no form.
- `/today` — amber `matches` banner; no list.

No 500 page.

- [ ] **Step 5: Restore env**

Stop the dev server. Restore `NR_API_TOKEN` in `.env` to the real value. Do NOT commit `.env` changes.

- [ ] **Step 6: Confirm no residual changes**

Run: `git status`
Expected: working tree clean (all earlier tasks committed; `.env` is gitignored so env edits do not show).

---

## Done criteria

- `mise run check:dispo` passes.
- Manual verification (Task 9) shows per-source banners, neutral-gray heat-map when courts fail, read-only match list when courts fail on `/day` / `/today`.
- No route returns a 500 when a single external source is unreachable.
