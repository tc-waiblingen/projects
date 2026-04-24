# Dispo Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a full-parity mobile experience for `apps/dispo` by extracting assignment state into a shared hook, splitting the desktop layout into its own shell, and adding a mobile shell (top bar, match list, bottom-sheet editor, two plan views) that activates below 768 px via CSS swap.

**Architecture:** Both desktop and mobile shells are always mounted; Tailwind `md:` (≥768 px) toggles visibility. A new `useDispoState` hook owns all assignment state, memoised derivations, effects, and action callbacks; both shells consume it. Desktop components move into `components/dispo/desktop/`, mobile into `components/dispo/mobile/`.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4, Vitest, `@testing-library/react`. Existing `dispo.css` is reused (both shells share it). `@tcw/calendar` and `@tcw/ebusy` workspace packages are already wired.

**Reference spec:** `docs/superpowers/specs/2026-04-24-dispo-mobile-design.md`.

**Working directory:** All paths are relative to repo root unless stated. Commands run from repo root.

**Commit style:** Conventional Commits, no `Co-Authored-By`. Examples: `feat(dispo): ...`, `refactor(dispo): ...`, `test(dispo): ...`, `docs(dispo): ...`.

---

## Task 1: Extract `useDispoState` hook (TDD)

Pull all state, memos, effects, and mutation handlers out of `DispoApp.tsx` into a single hook. Desktop-only concerns (drag state and handlers) stay behind for now and will move to `DesktopShell` in Task 3.

**Files:**
- Create: `apps/dispo/src/components/dispo/useDispoState.ts`
- Create: `apps/dispo/src/components/dispo/__tests__/useDispoState.test.tsx`

---

- [ ] **Step 1.1: Create the test file with the hook contract and action coverage**

Create `apps/dispo/src/components/dispo/__tests__/useDispoState.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { DispoCourt } from '@/lib/directus/courts'
import { useDispoState } from '../useDispoState'
import type { DispoMatch } from '../types'

const court = (id: number, type: 'tennis_indoor' | 'tennis_outdoor' = 'tennis_outdoor'): DispoCourt => ({
  id,
  name: type === 'tennis_indoor' ? `H${id}` : `P${id}`,
  type,
  sort: id,
})

const baseMatch = (overrides: Partial<DispoMatch> = {}): DispoMatch =>
  ({
    id: 'm1',
    homeTeam: 'TCW 1',
    homeTeamShort: 'TCW',
    opponent: 'Opp',
    league: 'Bezirksliga',
    leagueShort: 'BZL',
    leagueFull: 'Bezirksliga',
    group: 'Herren',
    startTime: '09:00',
    isHome: true,
    minCourts: 2,
    maxCourts: 4,
    ...overrides,
  } as DispoMatch)

function baseProps(overrides: Partial<Parameters<typeof useDispoState>[0]> = {}) {
  return {
    date: '2026-05-02',
    courts: [court(1, 'tennis_indoor'), court(2), court(3), court(4)],
    matches: [baseMatch()],
    initialAssignments: [],
    recentChangeMatchIds: [],
    bookingsByCourt: {},
    ...overrides,
  }
}

describe('useDispoState — selection', () => {
  it('selects and clears', () => {
    const { result } = renderHook(() => useDispoState(baseProps()))
    expect(result.current.selectedId).toBeNull()
    act(() => result.current.selectMatch('m1'))
    expect(result.current.selectedId).toBe('m1')
    act(() => result.current.clearSelection())
    expect(result.current.selectedId).toBeNull()
  })
})

describe('useDispoState — assignment actions', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('dropMatchOnCourt creates a new assignment with default duration', () => {
    const { result } = renderHook(() => useDispoState(baseProps()))
    act(() => result.current.dropMatchOnCourt('m1', 2))
    expect(result.current.assignments).toEqual([
      { matchId: 'm1', courtIds: [2], startTime: '09:00', durationH: 5.5 },
    ])
    expect(result.current.selectedId).toBe('m1')
  })

  it('dropMatchOnCourt appends a court to an existing assignment', () => {
    const { result } = renderHook(() =>
      useDispoState(
        baseProps({
          initialAssignments: [{ matchId: 'm1', courtIds: [2], startTime: '09:00', durationH: 5.5 }],
        }),
      ),
    )
    act(() => result.current.dropMatchOnCourt('m1', 3))
    expect(result.current.assignments[0]!.courtIds).toEqual([2, 3])
  })

  it('toggleCourt adds and removes a court for the selected match', () => {
    const { result } = renderHook(() => useDispoState(baseProps()))
    act(() => result.current.selectMatch('m1'))
    act(() => result.current.toggleCourt(3))
    expect(result.current.assignments[0]!.courtIds).toEqual([3])
    act(() => result.current.toggleCourt(3))
    expect(result.current.assignments).toEqual([])
  })

  it('removeCourtFromAssignment drops only that court, removes the row when empty', () => {
    const { result } = renderHook(() =>
      useDispoState(
        baseProps({
          initialAssignments: [{ matchId: 'm1', courtIds: [2, 3], startTime: '09:00', durationH: 5.5 }],
        }),
      ),
    )
    act(() => result.current.removeCourtFromAssignment('m1', 2))
    expect(result.current.assignments[0]!.courtIds).toEqual([3])
    act(() => result.current.removeCourtFromAssignment('m1', 3))
    expect(result.current.assignments).toEqual([])
  })

  it('moveAssignmentCourt swaps a court in place', () => {
    const { result } = renderHook(() =>
      useDispoState(
        baseProps({
          initialAssignments: [{ matchId: 'm1', courtIds: [2, 3], startTime: '09:00', durationH: 5.5 }],
        }),
      ),
    )
    act(() => result.current.moveAssignmentCourt('m1', 2, 4))
    expect(result.current.assignments[0]!.courtIds).toEqual([3, 4])
  })

  it('updateAssignment patches startTime', () => {
    const { result } = renderHook(() =>
      useDispoState(
        baseProps({
          initialAssignments: [{ matchId: 'm1', courtIds: [2], startTime: '09:00', durationH: 5.5 }],
        }),
      ),
    )
    act(() => result.current.updateAssignment('m1', { startTime: '10:30' }))
    expect(result.current.assignments[0]!.startTime).toBe('10:30')
  })

  it('resetAssignments clears everything (confirm mocked)', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { result } = renderHook(() =>
      useDispoState(
        baseProps({
          initialAssignments: [{ matchId: 'm1', courtIds: [2], startTime: '09:00', durationH: 5.5 }],
        }),
      ),
    )
    act(() => result.current.resetAssignments())
    expect(result.current.assignments).toEqual([])
    confirmSpy.mockRestore()
  })
})

describe('useDispoState — derived data', () => {
  it('flags under-assigned matches in issues', () => {
    const { result } = renderHook(() => useDispoState(baseProps()))
    const underIssue = result.current.issues.find((i) => i.key.startsWith('under:'))
    expect(underIssue?.detail).toMatch(/Keine Plätze/)
  })

  it('flags mixed indoor/outdoor assignments', () => {
    const { result } = renderHook(() =>
      useDispoState(
        baseProps({
          initialAssignments: [{ matchId: 'm1', courtIds: [1, 2], startTime: '09:00', durationH: 5.5 }],
        }),
      ),
    )
    expect(result.current.issues.some((i) => i.key.startsWith('mixed:'))).toBe(true)
  })

  it('flags court conflicts', () => {
    const { result } = renderHook(() =>
      useDispoState(
        baseProps({
          matches: [baseMatch(), baseMatch({ id: 'm2', startTime: '10:00' })],
          initialAssignments: [
            { matchId: 'm1', courtIds: [2], startTime: '09:00', durationH: 5.5 },
            { matchId: 'm2', courtIds: [2], startTime: '10:00', durationH: 5.5 },
          ],
        }),
      ),
    )
    expect(result.current.conflicts.length).toBeGreaterThan(0)
    expect(result.current.issues.some((i) => i.key.startsWith('conflict:'))).toBe(true)
  })
})

describe('useDispoState — auto-save', () => {
  it('does not save on first render', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    global.fetch = fetchMock
    vi.useFakeTimers()
    renderHook(() => useDispoState(baseProps()))
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(fetchMock).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('saves after a 400ms debounce once assignments change', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    global.fetch = fetchMock
    vi.useFakeTimers()
    const { result } = renderHook(() => useDispoState(baseProps()))
    act(() => result.current.dropMatchOnCourt('m1', 2))
    await act(async () => {
      vi.advanceTimersByTime(399)
    })
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(10)
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/assignments')
    vi.useRealTimers()
  })
})
```

- [ ] **Step 1.2: Run tests — expect failure**

```bash
pnpm --filter @tcw/dispo test -- useDispoState
```

Expected: FAIL with `Cannot find module '../useDispoState'` (hook doesn't exist yet).

- [ ] **Step 1.3: Implement the hook**

Create `apps/dispo/src/components/dispo/useDispoState.ts`:

```ts
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DispoCourt } from '@/lib/directus/courts'
import { bookingsFromRecord, type BookingsByCourt, type CourtBooking } from '@/lib/ebusy/reservations'
import {
  DAY_END,
  DAY_START,
  computeOccupancy,
  defaultDurationForCourtType,
  detectConflicts,
  parseTime,
  type OccupancyEntry,
  type PlanConflict,
} from '@/lib/plan-helpers'
import type { DispoAssignment, DispoMatch, Issue } from './types'

export interface UseDispoStateInput {
  date: string
  courts: DispoCourt[]
  matches: DispoMatch[]
  initialAssignments: DispoAssignment[]
  recentChangeMatchIds: string[]
  bookingsByCourt: BookingsByCourt
}

export interface DispoState {
  courts: DispoCourt[]
  matches: DispoMatch[]
  bookings: Map<number, CourtBooking[]>
  recentChangeIds: Set<string>
  matchGroupById: Map<string, string>

  assignments: DispoAssignment[]
  selectedId: string | null
  cursorMinutes: number
  nowMinutes: number | null

  occupancy: Map<number, OccupancyEntry>
  conflicts: PlanConflict[]
  issues: Issue[]
  highlightCourtIds: number[]

  saving: boolean
  saveError: string | null
  savedAt: number | null

  selectMatch: (id: string) => void
  clearSelection: () => void
  toggleCourt: (courtId: number) => void
  dropMatchOnCourt: (matchId: string, courtId: number) => void
  moveAssignmentCourt: (matchId: string, from: number, to: number) => void
  removeCourtFromAssignment: (matchId: string, courtId: number) => void
  updateAssignment: (matchId: string, patch: Partial<DispoAssignment>) => void
  setCursorMinutes: (n: number) => void
  resetAssignments: () => void
}

function useNowMinutesForDate(isoDate: string): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    function compute() {
      const today = new Date()
      const y = today.getFullYear()
      const m = String(today.getMonth() + 1).padStart(2, '0')
      const d = String(today.getDate()).padStart(2, '0')
      if (`${y}-${m}-${d}` !== isoDate) {
        setNow(null)
        return
      }
      setNow(today.getHours() * 60 + today.getMinutes())
    }
    compute()
    const id = setInterval(compute, 30_000)
    return () => clearInterval(id)
  }, [isoDate])
  return now
}

export function useDispoState(input: UseDispoStateInput): DispoState {
  const {
    date,
    courts,
    matches,
    initialAssignments,
    recentChangeMatchIds,
    bookingsByCourt,
  } = input

  const [assignments, setAssignments] = useState<DispoAssignment[]>(initialAssignments)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cursorMinutes, setCursorMinutes] = useState<number>(() => {
    if (initialAssignments.length > 0) return parseTime(initialAssignments[0]!.startTime) + 60
    if (matches.length > 0) return parseTime(matches[0]!.startTime) + 60
    return Math.round((DAY_START + DAY_END) / 2)
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const recentChangeIds = useMemo(() => new Set(recentChangeMatchIds), [recentChangeMatchIds])
  const bookings = useMemo(() => bookingsFromRecord(bookingsByCourt), [bookingsByCourt])
  const matchGroupById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of matches) map.set(m.id, m.group || m.leagueShort || '')
    return map
  }, [matches])

  const occupancy = useMemo(
    () => computeOccupancy(assignments, matchGroupById, cursorMinutes),
    [assignments, matchGroupById, cursorMinutes],
  )

  const conflicts: PlanConflict[] = useMemo(() => detectConflicts(assignments), [assignments])

  const issues: Issue[] = useMemo(() => {
    const list: Issue[] = []
    const courtTypeById = new Map(courts.map((c) => [c.id, c.type]))
    for (const m of matches) {
      const a = assignments.find((x) => x.matchId === m.id)
      const assigned = a?.courtIds.length ?? 0
      const teams = `${m.homeTeamShort ?? m.homeTeam} vs. ${m.opponent}`
      if (assigned < m.minCourts) {
        list.push({
          key: `under:${m.id}`,
          matchId: m.id,
          title: teams,
          detail:
            assigned === 0
              ? `Keine Plätze zugeteilt (min. ${m.minCourts})`
              : `Nur ${assigned} von ${m.minCourts} benötigten Plätzen zugeteilt`,
        })
      } else if (assigned > m.maxCourts) {
        list.push({
          key: `over:${m.id}`,
          matchId: m.id,
          title: teams,
          detail: `${assigned} Plätze zugeteilt (max. ${m.maxCourts})`,
        })
      }
      if (a && a.courtIds.length > 1) {
        const types = new Set(a.courtIds.map((id) => courtTypeById.get(id)).filter(Boolean))
        if (types.has('tennis_indoor') && types.has('tennis_outdoor')) {
          list.push({
            key: `mixed:${m.id}`,
            matchId: m.id,
            title: teams,
            detail: 'Halle und Außenplätze gemischt — nur eine Kategorie zuteilen',
          })
        }
      }
    }
    const courtNameById = new Map(courts.map((c) => [c.id, c.name]))
    const matchLabelById = new Map(
      matches.map((m) => [m.id, `${m.homeTeamShort ?? m.homeTeam} vs. ${m.opponent}`]),
    )
    for (const c of conflicts) {
      const courtName = courtNameById.get(c.courtId) ?? `Platz ${c.courtId}`
      const a = matchLabelById.get(c.matchIds[0]) ?? c.matchIds[0]
      const b = matchLabelById.get(c.matchIds[1]) ?? c.matchIds[1]
      list.push({
        key: `conflict:${c.courtId}:${c.matchIds[0]}:${c.matchIds[1]}`,
        matchId: c.matchIds[0],
        title: `${courtName} doppelt belegt`,
        detail: `${a} / ${b}`,
      })
    }
    return list
  }, [conflicts, assignments, matches, courts])

  const highlightCourtIds = useMemo(() => {
    if (!selectedId) return []
    const a = assignments.find((x) => x.matchId === selectedId)
    return a ? [...a.courtIds] : []
  }, [selectedId, assignments])

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstRunRef = useRef(true)

  const saveNow = useCallback(
    async (next: DispoAssignment[]) => {
      setSaving(true)
      setSaveError(null)
      try {
        const rows = next
          .filter((a) => a.courtIds.length > 0)
          .map((a) => ({
            matchId: a.matchId,
            matchTime: a.startTime,
            courtIds: a.courtIds,
          }))
        const plans = next.map((a) => ({
          matchId: a.matchId,
          startTime: a.startTime,
          durationH: a.durationH,
        }))
        const res = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, rows, plans }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `HTTP ${res.status}`)
        }
        setSavedAt(Date.now())
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : String(err))
      } finally {
        setSaving(false)
      }
    },
    [date],
  )

  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void saveNow(assignments)
    }, 400)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [assignments, saveNow])

  const dropMatchOnCourt = useCallback(
    (matchId: string, courtId: number) => {
      const match = matches.find((m) => m.id === matchId)
      if (!match) return
      const court = courts.find((c) => c.id === courtId)
      setAssignments((prev) => {
        const existing = prev.find((a) => a.matchId === matchId)
        if (existing) {
          if (existing.courtIds.includes(courtId)) return prev
          return prev.map((a) =>
            a.matchId === matchId ? { ...a, courtIds: [...a.courtIds, courtId] } : a,
          )
        }
        return [
          ...prev,
          {
            matchId,
            courtIds: [courtId],
            startTime: match.startTime,
            durationH: court ? defaultDurationForCourtType(court.type) : 5.5,
          },
        ]
      })
      setSelectedId(matchId)
    },
    [matches, courts],
  )

  const updateAssignment = useCallback((matchId: string, patch: Partial<DispoAssignment>) => {
    setAssignments((prev) => prev.map((a) => (a.matchId === matchId ? { ...a, ...patch } : a)))
  }, [])

  const removeCourtFromAssignment = useCallback((matchId: string, courtId: number) => {
    setAssignments((prev) => {
      const list: DispoAssignment[] = []
      for (const a of prev) {
        if (a.matchId !== matchId) {
          list.push(a)
          continue
        }
        const nextIds = a.courtIds.filter((c) => c !== courtId)
        if (nextIds.length === 0) continue
        list.push({ ...a, courtIds: nextIds })
      }
      return list
    })
  }, [])

  const moveAssignmentCourt = useCallback(
    (matchId: string, fromCourtId: number, toCourtId: number) => {
      if (fromCourtId === toCourtId) return
      setAssignments((prev) =>
        prev.map((a) => {
          if (a.matchId !== matchId) return a
          if (!a.courtIds.includes(fromCourtId)) return a
          const next = a.courtIds.filter((c) => c !== fromCourtId)
          if (!next.includes(toCourtId)) next.push(toCourtId)
          return { ...a, courtIds: next }
        }),
      )
    },
    [],
  )

  const toggleCourt = useCallback(
    (courtId: number) => {
      if (!selectedId) return
      const existing = assignments.find((a) => a.matchId === selectedId)
      if (existing && existing.courtIds.includes(courtId)) {
        removeCourtFromAssignment(selectedId, courtId)
      } else {
        dropMatchOnCourt(selectedId, courtId)
      }
    },
    [selectedId, assignments, dropMatchOnCourt, removeCourtFromAssignment],
  )

  const selectMatch = useCallback((id: string) => setSelectedId(id), [])
  const clearSelection = useCallback(() => setSelectedId(null), [])

  const resetAssignments = useCallback(() => {
    if (typeof window !== 'undefined' && !window.confirm('Alle Zuordnungen zurücksetzen?')) return
    setAssignments([])
    setSelectedId(null)
  }, [])

  const nowMinutes = useNowMinutesForDate(date)

  return {
    courts,
    matches,
    bookings,
    recentChangeIds,
    matchGroupById,

    assignments,
    selectedId,
    cursorMinutes,
    nowMinutes,

    occupancy,
    conflicts,
    issues,
    highlightCourtIds,

    saving,
    saveError,
    savedAt,

    selectMatch,
    clearSelection,
    toggleCourt,
    dropMatchOnCourt,
    moveAssignmentCourt,
    removeCourtFromAssignment,
    updateAssignment,
    setCursorMinutes,
    resetAssignments,
  }
}
```

- [ ] **Step 1.4: Run tests — expect pass**

```bash
pnpm --filter @tcw/dispo test -- useDispoState
```

Expected: All tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add apps/dispo/src/components/dispo/useDispoState.ts apps/dispo/src/components/dispo/__tests__/useDispoState.test.tsx
git commit -m "feat(dispo): extract useDispoState hook with full action + auto-save coverage"
```

---

## Task 2: Rewire `DispoApp.tsx` to consume `useDispoState`

Replace the inline state + handlers in `DispoApp.tsx` with a call to the hook. Behaviour must be identical on desktop; the file becomes smaller (~200 lines) but still renders the existing Header / Sidebar / MapView / VerticalTimeline. The shell split happens in Task 3.

**Files:**
- Modify: `apps/dispo/src/components/dispo/DispoApp.tsx` (full rewrite)

---

- [ ] **Step 2.1: Replace `DispoApp.tsx` with the hook-consuming version**

Overwrite `apps/dispo/src/components/dispo/DispoApp.tsx`:

```tsx
'use client'

import { useCallback, useState } from 'react'
import type { DispoCourt } from '@/lib/directus/courts'
import type { BookingsByCourt } from '@/lib/ebusy/reservations'
import { Header } from './Header'
import { Legend } from './Legend'
import { MapView } from './MapView'
import { Sidebar } from './Sidebar'
import { TimeSlider } from './TimeSlider'
import { VerticalTimeline } from './VerticalTimeline'
import type { DispoMatch, DispoView, DispoAssignment } from './types'
import { useDispoState } from './useDispoState'
import './dispo.css'

interface DispoAppProps {
  date: string
  courts: DispoCourt[]
  matches: DispoMatch[]
  initialAssignments: DispoAssignment[]
  recentChangeMatchIds: string[]
  lageplanSvg: string | null
  bookingsByCourt: BookingsByCourt
}

export function DispoApp(props: DispoAppProps) {
  const state = useDispoState(props)
  const [view, setView] = useState<DispoView>('vtimeline')
  const [draggingMatchId, setDraggingMatchId] = useState<string | null>(null)

  const handleDragStartMatch = useCallback((e: React.DragEvent, matchId: string) => {
    e.dataTransfer.setData('application/x-match-id', matchId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingMatchId(matchId)
  }, [])

  const handleDragEndMatch = useCallback(() => setDraggingMatchId(null), [])

  const isDragging = draggingMatchId !== null

  const mapProps = {
    svg: props.lageplanSvg,
    courts: state.courts,
    matches: state.matches,
    occupancy: state.occupancy,
    highlightCourtIds: state.highlightCourtIds,
    selectedMatchId: state.selectedId,
    selectedMatchAssignedCourtIds: state.highlightCourtIds,
    isDragging,
    onToggleCourt: state.toggleCourt,
    onSelectMatch: state.selectMatch,
    onDropMatch: state.dropMatchOnCourt,
    bookingsByCourt: state.bookings,
  }

  const vtlProps = {
    courts: state.courts,
    matches: state.matches,
    assignments: state.assignments,
    selectedId: state.selectedId,
    selectedMatchId: state.selectedId,
    selectedMatchAssignedCourtIds: state.highlightCourtIds,
    nowMinutes: state.nowMinutes,
    isDragging,
    onToggleCourt: state.toggleCourt,
    onSelectMatch: state.selectMatch,
    onDropMatch: state.dropMatchOnCourt,
    onUpdateAssignment: state.updateAssignment,
    onMoveAssignmentCourt: state.moveAssignmentCourt,
    onRemoveCourt: state.removeCourtFromAssignment,
    bookingsByCourt: state.bookings,
  }

  return (
    <div className="dispo-root app density-compact map-style-lageplan">
      <Header
        view={view}
        onViewChange={setView}
        issues={state.issues}
        onIssueSelect={state.selectMatch}
        saving={state.saving}
        saveError={state.saveError}
        savedAt={state.savedAt}
      />

      <div className="app-body">
        <Sidebar
          matches={state.matches}
          assignments={state.assignments}
          selectedId={state.selectedId}
          recentChangeMatchIds={state.recentChangeIds}
          onSelectMatch={state.selectMatch}
          onClearSelection={state.clearSelection}
          onDragStartMatch={handleDragStartMatch}
          onDragEndMatch={handleDragEndMatch}
          onResetAssignments={state.resetAssignments}
        />

        <div className="canvas-with-details">
          <main className="canvas">
            {view === 'map' && (
              <>
                <MapView {...mapProps} />
                <div className="map-cursor-ctrl">
                  <TimeSlider
                    value={state.cursorMinutes}
                    onChange={state.setCursorMinutes}
                    nowMinutes={state.nowMinutes}
                    label="Zeitpunkt"
                  />
                </div>
                <Legend />
              </>
            )}
            {view === 'vtimeline' && <VerticalTimeline {...vtlProps} />}
          </main>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2.2: Run tests and lint — expect pass**

```bash
pnpm --filter @tcw/dispo test
pnpm --filter @tcw/dispo lint
```

Expected: all existing tests still pass; no new lint errors.

- [ ] **Step 2.3: Manual smoke test on desktop**

Start dev server:
```bash
pnpm --filter @tcw/dispo dev
```

Open `http://localhost:3002` in a desktop-width browser. Navigate to a day with home matches. Verify: click a match, toggle courts on/off, drag a match card onto a column, change start time/duration, confirm auto-save pill flips from "Speichere …" to "Gespeichert · HH:MM", check issues badge updates, reset button works. No visual or behavioural regressions vs. before.

- [ ] **Step 2.4: Commit**

```bash
git add apps/dispo/src/components/dispo/DispoApp.tsx
git commit -m "refactor(dispo): consume useDispoState from DispoApp"
```

---

## Task 3: Move desktop components into `desktop/` and add `DesktopShell`

Pure relocation + thin wrapper. No behavioural change. Keeps desktop-specific code isolated so mobile code can sit alongside without conflict.

**Files:**
- Move: `Header.tsx`, `Sidebar.tsx`, `MapView.tsx`, `VerticalTimeline.tsx`, `TimeSlider.tsx`, `Legend.tsx`, `DetailsPanel.tsx` → `apps/dispo/src/components/dispo/desktop/`
- Create: `apps/dispo/src/components/dispo/desktop/DesktopShell.tsx`
- Modify: `apps/dispo/src/components/dispo/DispoApp.tsx`
- Leave in place: `CourtPicker.tsx`, `types.ts`, `dispo.css`, `useDispoState.ts` (shared)

---

- [ ] **Step 3.1: Create the desktop folder and move the files**

```bash
mkdir -p apps/dispo/src/components/dispo/desktop
cd apps/dispo/src/components/dispo
git mv Header.tsx desktop/Header.tsx
git mv Sidebar.tsx desktop/Sidebar.tsx
git mv MapView.tsx desktop/MapView.tsx
git mv VerticalTimeline.tsx desktop/VerticalTimeline.tsx
git mv TimeSlider.tsx desktop/TimeSlider.tsx
git mv Legend.tsx desktop/Legend.tsx
git mv DetailsPanel.tsx desktop/DetailsPanel.tsx
cd -
```

- [ ] **Step 3.2: Fix relative imports inside moved files**

Inside the moved files, any relative import like `from './types'` now needs `from '../types'`. Any import `from '@/lib/...'` stays (alias-based).

Run a quick grep:
```bash
grep -rn "from '\./" apps/dispo/src/components/dispo/desktop/
```

For each hit in `desktop/*.tsx`, if it references `./types` or `./CourtPicker` or `./dispo.css`, update to `'../types'`, `'../CourtPicker'`, `'../dispo.css'`. If it references a sibling desktop file (e.g. `./TimeSlider`), leave as-is — they moved together.

Known required edits:
- `desktop/Header.tsx`: `from '@/lib/plan-helpers'` and `from './types'` → change the `./types` to `'../types'`.
- `desktop/Sidebar.tsx`: `from './types'` → `'../types'`.
- `desktop/MapView.tsx`: `from './types'` → `'../types'`. If it imports `./CourtPicker`, change to `'../CourtPicker'`.
- `desktop/VerticalTimeline.tsx`: `from './types'` → `'../types'`.
- `desktop/DetailsPanel.tsx`: `from './types'` → `'../types'`. If it imports `./CourtPicker`, change to `'../CourtPicker'`.

- [ ] **Step 3.3: Create `DesktopShell.tsx`**

Create `apps/dispo/src/components/dispo/desktop/DesktopShell.tsx`:

```tsx
'use client'

import { useCallback, useState } from 'react'
import type { DispoState } from '../useDispoState'
import type { DispoView } from '../types'
import { Header } from './Header'
import { Legend } from './Legend'
import { MapView } from './MapView'
import { Sidebar } from './Sidebar'
import { TimeSlider } from './TimeSlider'
import { VerticalTimeline } from './VerticalTimeline'

interface DesktopShellProps {
  state: DispoState
  lageplanSvg: string | null
}

export function DesktopShell({ state, lageplanSvg }: DesktopShellProps) {
  const [view, setView] = useState<DispoView>('vtimeline')
  const [draggingMatchId, setDraggingMatchId] = useState<string | null>(null)

  const handleDragStartMatch = useCallback((e: React.DragEvent, matchId: string) => {
    e.dataTransfer.setData('application/x-match-id', matchId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingMatchId(matchId)
  }, [])
  const handleDragEndMatch = useCallback(() => setDraggingMatchId(null), [])
  const isDragging = draggingMatchId !== null

  const mapProps = {
    svg: lageplanSvg,
    courts: state.courts,
    matches: state.matches,
    occupancy: state.occupancy,
    highlightCourtIds: state.highlightCourtIds,
    selectedMatchId: state.selectedId,
    selectedMatchAssignedCourtIds: state.highlightCourtIds,
    isDragging,
    onToggleCourt: state.toggleCourt,
    onSelectMatch: state.selectMatch,
    onDropMatch: state.dropMatchOnCourt,
    bookingsByCourt: state.bookings,
  }

  const vtlProps = {
    courts: state.courts,
    matches: state.matches,
    assignments: state.assignments,
    selectedId: state.selectedId,
    selectedMatchId: state.selectedId,
    selectedMatchAssignedCourtIds: state.highlightCourtIds,
    nowMinutes: state.nowMinutes,
    isDragging,
    onToggleCourt: state.toggleCourt,
    onSelectMatch: state.selectMatch,
    onDropMatch: state.dropMatchOnCourt,
    onUpdateAssignment: state.updateAssignment,
    onMoveAssignmentCourt: state.moveAssignmentCourt,
    onRemoveCourt: state.removeCourtFromAssignment,
    bookingsByCourt: state.bookings,
  }

  return (
    <div className="dispo-desktop-shell contents">
      <Header
        view={view}
        onViewChange={setView}
        issues={state.issues}
        onIssueSelect={state.selectMatch}
        saving={state.saving}
        saveError={state.saveError}
        savedAt={state.savedAt}
      />
      <div className="app-body">
        <Sidebar
          matches={state.matches}
          assignments={state.assignments}
          selectedId={state.selectedId}
          recentChangeMatchIds={state.recentChangeIds}
          onSelectMatch={state.selectMatch}
          onClearSelection={state.clearSelection}
          onDragStartMatch={handleDragStartMatch}
          onDragEndMatch={handleDragEndMatch}
          onResetAssignments={state.resetAssignments}
        />
        <div className="canvas-with-details">
          <main className="canvas">
            {view === 'map' && (
              <>
                <MapView {...mapProps} />
                <div className="map-cursor-ctrl">
                  <TimeSlider
                    value={state.cursorMinutes}
                    onChange={state.setCursorMinutes}
                    nowMinutes={state.nowMinutes}
                    label="Zeitpunkt"
                  />
                </div>
                <Legend />
              </>
            )}
            {view === 'vtimeline' && <VerticalTimeline {...vtlProps} />}
          </main>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3.4: Rewrite `DispoApp.tsx` to use `DesktopShell`**

Overwrite `apps/dispo/src/components/dispo/DispoApp.tsx`:

```tsx
'use client'

import type { DispoCourt } from '@/lib/directus/courts'
import type { BookingsByCourt } from '@/lib/ebusy/reservations'
import { DesktopShell } from './desktop/DesktopShell'
import type { DispoAssignment, DispoMatch } from './types'
import { useDispoState } from './useDispoState'
import './dispo.css'

interface DispoAppProps {
  date: string
  courts: DispoCourt[]
  matches: DispoMatch[]
  initialAssignments: DispoAssignment[]
  recentChangeMatchIds: string[]
  lageplanSvg: string | null
  bookingsByCourt: BookingsByCourt
}

export function DispoApp(props: DispoAppProps) {
  const state = useDispoState(props)
  return (
    <div className="dispo-root app density-compact map-style-lageplan">
      <DesktopShell state={state} lageplanSvg={props.lageplanSvg} />
    </div>
  )
}
```

- [ ] **Step 3.5: Run lint, tests, and build**

```bash
pnpm --filter @tcw/dispo lint
pnpm --filter @tcw/dispo test
pnpm --filter @tcw/dispo build
```

Expected: all pass. Build is the most sensitive to missed import fixes.

- [ ] **Step 3.6: Manual smoke test on desktop**

Same walkthrough as Step 2.3. No regression.

- [ ] **Step 3.7: Commit**

```bash
git add apps/dispo/src/components/dispo/
git commit -m "refactor(dispo): move desktop components into desktop/ + DesktopShell"
```

---

## Task 4: Add empty `MobileShell` wired via CSS swap

Scaffolding only: an empty `MobileShell` that renders a placeholder, mounted alongside `DesktopShell`, with Tailwind `md:` visibility. Below 768 px you see the placeholder; at/above 768 px the desktop shell shows.

**Files:**
- Create: `apps/dispo/src/components/dispo/mobile/MobileShell.tsx`
- Modify: `apps/dispo/src/components/dispo/DispoApp.tsx`
- Modify: `apps/dispo/src/components/dispo/dispo.css` (add mobile-shell scope + hide desktop-only rules below md)

---

- [ ] **Step 4.1: Create the empty `MobileShell`**

Create `apps/dispo/src/components/dispo/mobile/MobileShell.tsx`:

```tsx
'use client'

import type { DispoState } from '../useDispoState'

interface MobileShellProps {
  state: DispoState
}

export function MobileShell({ state }: MobileShellProps) {
  return (
    <div className="dispo-mobile-shell">
      <div className="p-4 text-sm text-muted">
        Mobile Shell — {state.matches.length} Heimspiele, {state.assignments.length} Zuordnungen.
      </div>
    </div>
  )
}
```

- [ ] **Step 4.2: Wire CSS swap in `DispoApp.tsx`**

Overwrite `apps/dispo/src/components/dispo/DispoApp.tsx`:

```tsx
'use client'

import type { DispoCourt } from '@/lib/directus/courts'
import type { BookingsByCourt } from '@/lib/ebusy/reservations'
import { DesktopShell } from './desktop/DesktopShell'
import { MobileShell } from './mobile/MobileShell'
import type { DispoAssignment, DispoMatch } from './types'
import { useDispoState } from './useDispoState'
import './dispo.css'

interface DispoAppProps {
  date: string
  courts: DispoCourt[]
  matches: DispoMatch[]
  initialAssignments: DispoAssignment[]
  recentChangeMatchIds: string[]
  lageplanSvg: string | null
  bookingsByCourt: BookingsByCourt
}

export function DispoApp(props: DispoAppProps) {
  const state = useDispoState(props)
  return (
    <>
      <div className="dispo-root app density-compact map-style-lageplan hidden md:flex">
        <DesktopShell state={state} lageplanSvg={props.lageplanSvg} />
      </div>
      <div className="dispo-root dispo-root-mobile md:hidden flex">
        <MobileShell state={state} />
      </div>
    </>
  )
}
```

Note: we attach `md:hidden` / `hidden md:flex` to the outer `dispo-root` wrappers so the whole subtree (including the CSS grid `app-body`) is inert on the wrong viewport. Using `flex` (matching `dispo-root.app`'s `display: flex`) keeps desktop layout working.

- [ ] **Step 4.3: Add the mobile wrapper base CSS**

No re-scoping of existing desktop rules is needed: desktop CSS uses class names that only exist inside the desktop subtree (`.app-body`, `.sidebar`, `.vtl-*`, `.court-zone`, etc.). Those selectors simply don't match anything in the mobile DOM. Shared helpers (`.btn`, `.issues-badge`, `.issues-dropdown`, `.match-card`, `.court-picker`, `.cp-chip`, `.field`, `.duration-control`) are intentionally shared and stay at `.dispo-root`.

Only add the mobile wrapper's base rules. Append to `apps/dispo/src/components/dispo/dispo.css`:

```css
/* ---------- Mobile shell ---------- */
.dispo-root.dispo-root-mobile {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: var(--color-taupe-100);
  color: var(--fg-body);
  font-family: var(--font-sans);
  font-size: 13px;
}
```

If, later, any desktop rule does leak into a mobile element (e.g. `.match-card` gets a desktop-only cursor/hover rule), scope it then — don't pre-emptively rescope the file.

- [ ] **Step 4.4: Verify build + desktop regression**

```bash
pnpm --filter @tcw/dispo lint
pnpm --filter @tcw/dispo build
pnpm --filter @tcw/dispo dev
```

Open `http://localhost:3002/day/<a-match-day>` in a desktop-width browser. Desktop shell renders as before. Resize the window narrower than 768 px — desktop shell disappears, the mobile placeholder appears with the match/assignment counts.

- [ ] **Step 4.5: Commit**

```bash
git add apps/dispo/src/components/dispo/
git commit -m "feat(dispo): add mobile shell placeholder with CSS swap at md breakpoint"
```

---

## Task 5: Build `MobileTopBar` (date nav, issues pill, save status)

**Files:**
- Create: `apps/dispo/src/components/dispo/mobile/MobileTopBar.tsx`
- Modify: `apps/dispo/src/components/dispo/mobile/MobileShell.tsx`
- Modify: `apps/dispo/src/components/dispo/dispo.css` (mobile top bar styles)

---

- [ ] **Step 5.1: Create `MobileTopBar.tsx`**

Create `apps/dispo/src/components/dispo/mobile/MobileTopBar.tsx`:

```tsx
'use client'

import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Issue } from '../types'
import { formatTime } from '@/lib/plan-helpers'

interface MobileTopBarProps {
  date: string
  prevDateKey: string | null
  nextDateKey: string | null
  formattedDate: string
  issues: Issue[]
  onIssueSelect: (matchId: string) => void
  saving: boolean
  saveError: string | null
  savedAt: number | null
}

export function MobileTopBar({
  date,
  prevDateKey,
  nextDateKey,
  formattedDate,
  issues,
  onIssueSelect,
  saving,
  saveError,
  savedAt,
}: MobileTopBarProps) {
  const router = useRouter()
  const [issuesOpen, setIssuesOpen] = useState(false)
  const issuesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!issuesOpen) return
    function onDocClick(e: MouseEvent) {
      if (!issuesRef.current) return
      if (!issuesRef.current.contains(e.target as Node)) setIssuesOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIssuesOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [issuesOpen])

  const issueCount = issues.length
  const hasIssues = issueCount > 0

  return (
    <header className="mobile-topbar">
      <button
        type="button"
        className="mobile-chevron"
        aria-label="Vorheriger Spieltag"
        disabled={!prevDateKey}
        onClick={() => prevDateKey && router.push(`/day/${prevDateKey}`)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div className="mobile-date">{formattedDate}</div>

      <button
        type="button"
        className="mobile-chevron"
        aria-label="Nächster Spieltag"
        disabled={!nextDateKey}
        onClick={() => nextDateKey && router.push(`/day/${nextDateKey}`)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>

      <div className="mobile-topbar-spacer" />

      <div className="issues-wrap" ref={issuesRef}>
        <button
          type="button"
          className={clsx('issues-badge', hasIssues ? 'has-issues' : 'all-good', issuesOpen && 'is-open')}
          aria-expanded={issuesOpen}
          disabled={!hasIssues}
          onClick={() => setIssuesOpen((v) => !v)}
        >
          {hasIssues ? `${issueCount}` : '✓'}
        </button>
        {issuesOpen && (
          <div className="issues-dropdown" role="menu">
            {issues.map((iss) => (
              <button
                key={iss.key}
                type="button"
                role="menuitem"
                className="issues-dropdown-item"
                onClick={() => {
                  onIssueSelect(iss.matchId)
                  setIssuesOpen(false)
                }}
              >
                <span className="issues-dropdown-title">{iss.title}</span>
                <span className="issues-dropdown-detail">{iss.detail}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <MobileSaveStatus saving={saving} saveError={saveError} savedAt={savedAt} />
    </header>
  )
}

function MobileSaveStatus({ saving, saveError, savedAt }: { saving: boolean; saveError: string | null; savedAt: number | null }) {
  if (saveError) {
    return (
      <span className="mobile-save-icon is-error" title={saveError} aria-label={`Fehler: ${saveError}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </span>
    )
  }
  if (saving) return <span className="mobile-save-icon is-saving" aria-label="Speichere" />
  if (savedAt) {
    const d = new Date(savedAt)
    const time = formatTime(d.getHours() * 60 + d.getMinutes())
    return (
      <span className="mobile-save-icon is-saved" aria-label={`Gespeichert ${time}`} title={`Gespeichert · ${time}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </span>
    )
  }
  return null
}
```

- [ ] **Step 5.2: Add mobile top-bar CSS**

Append to `apps/dispo/src/components/dispo/dispo.css`:

```css
.dispo-root.dispo-root-mobile .mobile-topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-tcw-accent-100);
  border-bottom: 1px solid var(--border-subtle);
  height: 56px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
}
.dispo-root.dispo-root-mobile .mobile-chevron {
  background: transparent;
  border: 0;
  padding: 8px;
  border-radius: 999px;
  color: var(--fg-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dispo-root.dispo-root-mobile .mobile-chevron:disabled { opacity: 0.3; }
.dispo-root.dispo-root-mobile .mobile-chevron:hover:not(:disabled) { background: color-mix(in oklch, black 6%, transparent); color: var(--fg-heading); }
.dispo-root.dispo-root-mobile .mobile-date {
  font-size: 13px;
  font-weight: 700;
  color: var(--fg-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dispo-root.dispo-root-mobile .mobile-topbar-spacer { flex: 1; }
.dispo-root.dispo-root-mobile .mobile-save-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
}
.dispo-root.dispo-root-mobile .mobile-save-icon.is-saved { color: oklch(60% 0.15 155); }
.dispo-root.dispo-root-mobile .mobile-save-icon.is-error { background: color-mix(in oklch, var(--color-tcw-red-500) 12%, transparent); color: var(--color-tcw-red-800); }
.dispo-root.dispo-root-mobile .mobile-save-icon.is-saving {
  width: 14px; height: 14px; margin: 7px;
  border-radius: 50%;
  border: 2px solid color-mix(in oklch, var(--fg-muted) 40%, transparent);
  border-top-color: var(--fg-muted);
  animation: dispo-spin 0.8s linear infinite;
}
```

- [ ] **Step 5.3: Pipe prev/next keys and formatted date from page into `DispoApp`**

The page already computes `homeMatchDateKeys`. Pass the prev/next keys + a formatted date down to `DispoApp` so `MobileTopBar` can render without duplicating logic.

Modify `apps/dispo/src/app/day/[date]/page.tsx`. Near the end of the function body (before `return`), add:

```ts
const prevMobileKey = [...homeMatchDateKeys].reverse().find((k) => k < dateParam) ?? null
const nextMobileKey = homeMatchDateKeys.find((k) => k > dateParam) ?? null
const mobileFormattedDate = formatDateLong(date)
```

Then in the `<DispoApp ... />` JSX, add three new props:

```tsx
<DispoApp
  date={dateParam}
  courts={courts}
  matches={dispoMatches}
  initialAssignments={initialAssignments}
  recentChangeMatchIds={recentChangeMatchIds}
  lageplanSvg={lageplanSvg}
  bookingsByCourt={bookingsByCourt}
  prevDateKey={prevMobileKey}
  nextDateKey={nextMobileKey}
  formattedDate={mobileFormattedDate}
/>
```

Modify `apps/dispo/src/components/dispo/DispoApp.tsx` — extend `DispoAppProps` and pass down:

```tsx
interface DispoAppProps {
  date: string
  courts: DispoCourt[]
  matches: DispoMatch[]
  initialAssignments: DispoAssignment[]
  recentChangeMatchIds: string[]
  lageplanSvg: string | null
  bookingsByCourt: BookingsByCourt
  prevDateKey: string | null
  nextDateKey: string | null
  formattedDate: string
}

export function DispoApp(props: DispoAppProps) {
  const state = useDispoState(props)
  return (
    <>
      <div className="dispo-root app density-compact map-style-lageplan hidden md:flex">
        <DesktopShell state={state} lageplanSvg={props.lageplanSvg} />
      </div>
      <div className="dispo-root dispo-root-mobile md:hidden flex">
        <MobileShell
          state={state}
          prevDateKey={props.prevDateKey}
          nextDateKey={props.nextDateKey}
          formattedDate={props.formattedDate}
          date={props.date}
        />
      </div>
    </>
  )
}
```

- [ ] **Step 5.4: Wire `MobileTopBar` into `MobileShell`**

Overwrite `apps/dispo/src/components/dispo/mobile/MobileShell.tsx`:

```tsx
'use client'

import type { DispoState } from '../useDispoState'
import { MobileTopBar } from './MobileTopBar'

interface MobileShellProps {
  state: DispoState
  date: string
  prevDateKey: string | null
  nextDateKey: string | null
  formattedDate: string
}

export function MobileShell({ state, date, prevDateKey, nextDateKey, formattedDate }: MobileShellProps) {
  return (
    <div className="mobile-shell">
      <MobileTopBar
        date={date}
        prevDateKey={prevDateKey}
        nextDateKey={nextDateKey}
        formattedDate={formattedDate}
        issues={state.issues}
        onIssueSelect={state.selectMatch}
        saving={state.saving}
        saveError={state.saveError}
        savedAt={state.savedAt}
      />
      <div className="mobile-scroll">
        <p className="empty-hint">Tabs und Liste folgen in Task 6.</p>
      </div>
    </div>
  )
}
```

Append CSS for the shell scroll region:

```css
.dispo-root.dispo-root-mobile .mobile-shell { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.dispo-root.dispo-root-mobile .mobile-scroll { flex: 1; overflow-y: auto; padding: 12px; }
```

- [ ] **Step 5.5: Verify on a narrow viewport**

```bash
pnpm --filter @tcw/dispo dev
```

Browser at ≤375 px. Top bar shows prev/next chevrons, date, issues pill (green `✓` when clean, red count when there are issues), save icon flips on edits. Chevrons navigate between days. Desktop view at ≥768 px still unchanged.

- [ ] **Step 5.6: Commit**

```bash
git add apps/dispo/src/components/dispo/ apps/dispo/src/app/day/[date]/page.tsx
git commit -m "feat(dispo): mobile top bar with date nav, issues pill, save status"
```

---

## Task 6: Build `MobileTabs` + `MobileMatchList`

**Files:**
- Create: `apps/dispo/src/components/dispo/mobile/MobileTabs.tsx`
- Create: `apps/dispo/src/components/dispo/mobile/MobileMatchList.tsx`
- Modify: `apps/dispo/src/components/dispo/mobile/MobileShell.tsx`
- Modify: `apps/dispo/src/components/dispo/dispo.css`

The `MobileMatchList` reuses match-card markup from the existing desktop `Sidebar` but drops drag. We duplicate the small card rendering rather than couple through a shared component so mobile has no drag-related props.

---

- [ ] **Step 6.1: Create `MobileTabs.tsx`**

Create `apps/dispo/src/components/dispo/mobile/MobileTabs.tsx`:

```tsx
'use client'

import clsx from 'clsx'

export type MobileTab = 'spiele' | 'plan'

interface MobileTabsProps {
  value: MobileTab
  onChange: (t: MobileTab) => void
}

export function MobileTabs({ value, onChange }: MobileTabsProps) {
  return (
    <div className="mobile-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={value === 'spiele'}
        className={clsx('mobile-tab', value === 'spiele' && 'is-active')}
        onClick={() => onChange('spiele')}
      >
        Spiele
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'plan'}
        className={clsx('mobile-tab', value === 'plan' && 'is-active')}
        onClick={() => onChange('plan')}
      >
        Plan
      </button>
    </div>
  )
}
```

- [ ] **Step 6.2: Create `MobileMatchList.tsx`**

Create `apps/dispo/src/components/dispo/mobile/MobileMatchList.tsx`:

```tsx
'use client'

import clsx from 'clsx'
import { groupColor } from '@/lib/plan-helpers'
import type { DispoAssignment, DispoMatch } from '../types'

interface MobileMatchListProps {
  matches: DispoMatch[]
  assignments: DispoAssignment[]
  selectedId: string | null
  recentChangeIds: Set<string>
  onSelectMatch: (id: string) => void
  onResetAssignments: () => void
}

export function MobileMatchList({
  matches,
  assignments,
  selectedId,
  recentChangeIds,
  onSelectMatch,
  onResetAssignments,
}: MobileMatchListProps) {
  const byId = new Map(assignments.map((a) => [a.matchId, a]))
  return (
    <div className="mobile-match-list">
      {matches.length === 0 ? (
        <div className="empty-hint">Keine Heimspiele.</div>
      ) : (
        matches.map((m) => {
          const a = byId.get(m.id)
          const gc = groupColor(m.group || m.league || '')
          const selected = selectedId === m.id
          const assigned = a?.courtIds.length ?? 0
          const under = !!a && assigned < m.minCourts
          const changed = recentChangeIds.has(m.id)
          return (
            <button
              key={m.id}
              type="button"
              className={clsx('match-card', selected && 'is-selected', a && 'is-assigned')}
              onClick={() => onSelectMatch(m.id)}
            >
              <span className="match-card-stripe" style={{ background: gc.bg }} />
              <span className="match-card-body">
                <span className="match-card-group">
                  <span>{m.group || m.leagueShort || m.league || ''}</span>
                  {changed && <span className="change-badge">Geändert</span>}
                </span>
                <span className="match-card-teams">
                  <span className="home">{m.homeTeamShort ?? m.homeTeam}</span>
                  <span className="vs">vs.</span>
                  <span className="away">{m.opponent}</span>
                </span>
                <span className="match-card-meta">
                  <span>{m.startTime} Uhr</span>
                  <span className="dot">·</span>
                  <span>{m.minCourts}–{m.maxCourts} Plätze</span>
                  {a && (
                    <>
                      <span className="dot">·</span>
                      <span className={clsx('courts-assigned', under && 'is-under')}>
                        {assigned} zugeteilt
                      </span>
                    </>
                  )}
                </span>
              </span>
            </button>
          )
        })
      )}
      <button
        type="button"
        className="btn btn-text mobile-reset"
        onClick={onResetAssignments}
      >
        Alle Zuordnungen zurücksetzen
      </button>
    </div>
  )
}
```

Note: the outer element is a `<button>` (not a `<div>`) so the entire card is a single native tap target — no hover-only affordance needed. The existing `.match-card` CSS already reads well on a button. The inner elements are `<span>`s because buttons cannot contain block descendants.

- [ ] **Step 6.3: Wire tabs + list into `MobileShell`**

Overwrite `apps/dispo/src/components/dispo/mobile/MobileShell.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { DispoState } from '../useDispoState'
import { MobileTopBar } from './MobileTopBar'
import { MobileTabs, type MobileTab } from './MobileTabs'
import { MobileMatchList } from './MobileMatchList'

interface MobileShellProps {
  state: DispoState
  date: string
  prevDateKey: string | null
  nextDateKey: string | null
  formattedDate: string
}

export function MobileShell({ state, date, prevDateKey, nextDateKey, formattedDate }: MobileShellProps) {
  const [tab, setTab] = useState<MobileTab>('spiele')
  return (
    <div className="mobile-shell">
      <MobileTopBar
        date={date}
        prevDateKey={prevDateKey}
        nextDateKey={nextDateKey}
        formattedDate={formattedDate}
        issues={state.issues}
        onIssueSelect={(id) => {
          setTab('spiele')
          state.selectMatch(id)
        }}
        saving={state.saving}
        saveError={state.saveError}
        savedAt={state.savedAt}
      />
      <MobileTabs value={tab} onChange={setTab} />
      <div className="mobile-scroll">
        {tab === 'spiele' && (
          <MobileMatchList
            matches={state.matches}
            assignments={state.assignments}
            selectedId={state.selectedId}
            recentChangeIds={state.recentChangeIds}
            onSelectMatch={state.selectMatch}
            onResetAssignments={state.resetAssignments}
          />
        )}
        {tab === 'plan' && <div className="empty-hint">Plan view folgt in Task 8.</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 6.4: Mobile tabs + list CSS**

Append to `apps/dispo/src/components/dispo/dispo.css`:

```css
.dispo-root.dispo-root-mobile .mobile-tabs {
  display: flex;
  gap: 0;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 56px;
  z-index: 9;
}
.dispo-root.dispo-root-mobile .mobile-tab {
  flex: 1;
  background: transparent;
  border: 0;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--fg-muted);
  border-bottom: 2px solid transparent;
  transition: color .15s, border-color .15s;
}
.dispo-root.dispo-root-mobile .mobile-tab.is-active {
  color: var(--color-tcw-accent-900);
  border-bottom-color: var(--color-tcw-red-500);
}
.dispo-root.dispo-root-mobile .mobile-match-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dispo-root.dispo-root-mobile .mobile-match-list .match-card {
  text-align: left;
  font: inherit;
}
.dispo-root.dispo-root-mobile .mobile-match-list .match-card-teams,
.dispo-root.dispo-root-mobile .mobile-match-list .match-card-group,
.dispo-root.dispo-root-mobile .mobile-match-list .match-card-meta,
.dispo-root.dispo-root-mobile .mobile-match-list .match-card-body { display: flex; }
.dispo-root.dispo-root-mobile .mobile-match-list .match-card-body { flex-direction: column; padding: 10px 12px; flex: 1; min-width: 0; }
.dispo-root.dispo-root-mobile .mobile-match-list .match-card-group { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--fg-muted); gap: 6px; align-items: center; margin-bottom: 2px; }
.dispo-root.dispo-root-mobile .mobile-match-list .match-card-teams { font-size: 14px; font-weight: 600; color: var(--fg-heading); gap: 6px; flex-wrap: wrap; align-items: baseline; line-height: 1.3; }
.dispo-root.dispo-root-mobile .mobile-match-list .match-card-meta { font-size: 12px; color: var(--fg-muted); gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
.dispo-root.dispo-root-mobile .mobile-match-list .mobile-reset { align-self: flex-start; margin-top: 12px; }
```

- [ ] **Step 6.5: Verify**

Dev server, narrow viewport. Tabs switch, match list renders, tapping a card sets `selectedId` (visible via `is-selected` border). The Plan tab still shows the placeholder — next task.

- [ ] **Step 6.6: Commit**

```bash
git add apps/dispo/src/components/dispo/
git commit -m "feat(dispo): mobile tabs + match list"
```

---

## Task 7: Build `MobileEditorSheet`

Bottom sheet bound to `state.selectedId`. Opens when a match is selected; dismisses via backdrop tap, close button, or Escape.

**Files:**
- Create: `apps/dispo/src/components/dispo/mobile/MobileEditorSheet.tsx`
- Modify: `apps/dispo/src/components/dispo/mobile/MobileShell.tsx`
- Modify: `apps/dispo/src/components/dispo/dispo.css`

---

- [ ] **Step 7.1: Create `MobileEditorSheet.tsx`**

Create `apps/dispo/src/components/dispo/mobile/MobileEditorSheet.tsx`:

```tsx
'use client'

import clsx from 'clsx'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { DispoCourt } from '@/lib/directus/courts'
import { CourtPicker } from '../CourtPicker'
import type { DispoAssignment, DispoMatch } from '../types'
import type { PlanConflict } from '@/lib/plan-helpers'

interface MobileEditorSheetProps {
  match: DispoMatch
  assignment: DispoAssignment | null
  courts: DispoCourt[]
  conflicts: PlanConflict[]
  onClose: () => void
  onToggleCourt: (courtId: number) => void
  onUpdateAssignment: (matchId: string, patch: Partial<DispoAssignment>) => void
  onRemoveCourt: (matchId: string, courtId: number) => void
}

export function MobileEditorSheet({
  match,
  assignment,
  courts,
  conflicts,
  onClose,
  onToggleCourt,
  onUpdateAssignment,
  onRemoveCourt,
}: MobileEditorSheetProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  const courtIds = assignment?.courtIds ?? []
  const assigned = courtIds.length
  const matchConflicts = conflicts.filter((c) => c.matchIds.includes(match.id))
  const groupLabel = match.group || match.leagueShort || match.league || ''

  const countClass = assigned < match.minCourts ? 'is-under' : assigned > match.maxCourts ? 'is-over' : 'is-ok'

  const setStartTime = (value: string) => {
    if (!assignment) return
    onUpdateAssignment(match.id, { startTime: value })
  }

  const adjustDuration = (delta: number) => {
    if (!assignment) return
    const next = Math.max(1, Math.min(12, Math.round((assignment.durationH + delta) * 2) / 2))
    onUpdateAssignment(match.id, { durationH: next })
  }

  return createPortal(
    <div className="mobile-sheet-layer" role="dialog" aria-modal="true" aria-label={`${match.homeTeamShort ?? match.homeTeam} gegen ${match.opponent}`}>
      <div className="mobile-sheet-backdrop" onClick={onClose} />
      <div className="mobile-sheet">
        <div className="mobile-sheet-grab" aria-hidden />
        <div className="mobile-sheet-head">
          <div className="mobile-sheet-eyebrow">{groupLabel}</div>
          <div className="mobile-sheet-title">
            <strong>{match.homeTeamShort ?? match.homeTeam}</strong>
            <span className="vs-muted">vs.</span>
            <span>{match.opponent}</span>
          </div>
          <button type="button" className="icon-btn mobile-sheet-close" aria-label="Schließen" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mobile-sheet-body">
          <div className="field-row">
            <div className="field">
              <label htmlFor={`time-${match.id}`}>Start</label>
              <input
                id={`time-${match.id}`}
                type="time"
                value={assignment?.startTime ?? match.startTime}
                disabled={!assignment}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Dauer</label>
              <div className="duration-control">
                <button type="button" className="btn-step" onClick={() => adjustDuration(-0.5)} disabled={!assignment}>−</button>
                <span className="dur-value">{assignment ? `${assignment.durationH.toFixed(1)} h` : '—'}</span>
                <button type="button" className="btn-step" onClick={() => adjustDuration(0.5)} disabled={!assignment}>+</button>
              </div>
            </div>
          </div>

          <div className="field">
            <div className="field-label-row">
              <label>Plätze <span className="min-max">({match.minCourts}–{match.maxCourts})</span></label>
              <span className={clsx('count-badge', countClass)}>{assigned}</span>
            </div>
            <CourtPicker
              courts={courts}
              value={courtIds}
              onChange={(next) => {
                const prev = new Set(courtIds)
                const now = new Set(next)
                for (const id of prev) if (!now.has(id)) onRemoveCourt(match.id, id)
                for (const id of now) if (!prev.has(id)) onToggleCourt(id)
              }}
            />
          </div>

          {matchConflicts.length > 0 && (
            <div className="field conflicts">
              <label>Konflikte</label>
              {matchConflicts.map((c) => (
                <div key={`${c.courtId}:${c.matchIds[0]}:${c.matchIds[1]}`} className="conflict-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  </svg>
                  Platz doppelt belegt
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
```

Note: `CourtPicker.onChange` gives a full next-list. We translate the diff into `onToggleCourt` / `onRemoveCourt` calls so the hook's action semantics are preserved (the hook relies on `selectedId` being set for `toggleCourt`, which is already the case when the sheet is open).

- [ ] **Step 7.2: Wire the sheet into `MobileShell`**

Append to `apps/dispo/src/components/dispo/mobile/MobileShell.tsx` — update the function body to render the sheet when `selectedId` is set:

```tsx
'use client'

import { useMemo, useState } from 'react'
import type { DispoState } from '../useDispoState'
import { MobileTopBar } from './MobileTopBar'
import { MobileTabs, type MobileTab } from './MobileTabs'
import { MobileMatchList } from './MobileMatchList'
import { MobileEditorSheet } from './MobileEditorSheet'

interface MobileShellProps {
  state: DispoState
  date: string
  prevDateKey: string | null
  nextDateKey: string | null
  formattedDate: string
}

export function MobileShell({ state, date, prevDateKey, nextDateKey, formattedDate }: MobileShellProps) {
  const [tab, setTab] = useState<MobileTab>('spiele')
  const selectedMatch = useMemo(
    () => (state.selectedId ? state.matches.find((m) => m.id === state.selectedId) ?? null : null),
    [state.selectedId, state.matches],
  )
  const selectedAssignment = useMemo(
    () => (state.selectedId ? state.assignments.find((a) => a.matchId === state.selectedId) ?? null : null),
    [state.selectedId, state.assignments],
  )

  return (
    <div className="mobile-shell">
      <MobileTopBar
        date={date}
        prevDateKey={prevDateKey}
        nextDateKey={nextDateKey}
        formattedDate={formattedDate}
        issues={state.issues}
        onIssueSelect={(id) => {
          setTab('spiele')
          state.selectMatch(id)
        }}
        saving={state.saving}
        saveError={state.saveError}
        savedAt={state.savedAt}
      />
      <MobileTabs value={tab} onChange={setTab} />
      <div className="mobile-scroll">
        {tab === 'spiele' && (
          <MobileMatchList
            matches={state.matches}
            assignments={state.assignments}
            selectedId={state.selectedId}
            recentChangeIds={state.recentChangeIds}
            onSelectMatch={state.selectMatch}
            onResetAssignments={state.resetAssignments}
          />
        )}
        {tab === 'plan' && <div className="empty-hint">Plan view folgt in Task 8.</div>}
      </div>
      {selectedMatch && (
        <MobileEditorSheet
          match={selectedMatch}
          assignment={selectedAssignment}
          courts={state.courts}
          conflicts={state.conflicts}
          onClose={state.clearSelection}
          onToggleCourt={state.toggleCourt}
          onUpdateAssignment={state.updateAssignment}
          onRemoveCourt={state.removeCourtFromAssignment}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 7.3: Sheet CSS**

Append to `apps/dispo/src/components/dispo/dispo.css`:

```css
.dispo-root.dispo-root-mobile + .mobile-sheet-layer,
.mobile-sheet-layer {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.mobile-sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  animation: dispo-fade-in .15s ease-out;
}
.mobile-sheet {
  position: relative;
  width: 100%;
  max-width: 640px;
  max-height: 85vh;
  background: #fffcf4;
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
  box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.22);
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  animation: dispo-slide-up .18s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.mobile-sheet-grab { width: 40px; height: 4px; background: color-mix(in oklch, black 18%, transparent); border-radius: 2px; margin: 0 auto 10px; }
.mobile-sheet-head { position: relative; padding-right: 32px; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px; }
.mobile-sheet-eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fg-muted); margin-bottom: 2px; }
.mobile-sheet-title { display: flex; align-items: baseline; gap: 8px; font-size: 16px; color: var(--fg-heading); line-height: 1.25; flex-wrap: wrap; }
.mobile-sheet-title .vs-muted { font-size: 12px; font-weight: 400; color: var(--fg-muted); }
.mobile-sheet-close { position: absolute; top: 0; right: 0; }
.mobile-sheet-body { overflow-y: auto; flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 14px; }
.mobile-sheet .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

@keyframes dispo-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes dispo-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
```

- [ ] **Step 7.4: Verify**

Narrow viewport: tap a match card → sheet slides up, chip row shows current courts, start time and duration reflect the assignment, conflicts list appears if any. Tap chip → count updates, save status flips to "Speichere …" then "Gespeichert · HH:MM". Swipe-down is a stretch goal; for now tap backdrop / Escape / close button all dismiss.

- [ ] **Step 7.5: Commit**

```bash
git add apps/dispo/src/components/dispo/
git commit -m "feat(dispo): mobile editor bottom sheet"
```

---

## Task 8: Build `MobilePlanColumns`

Vertical timeline adapted for phones. Tap-only, no drag, no resize. Narrow columns, horizontal scroll.

**Files:**
- Create: `apps/dispo/src/components/dispo/mobile/MobilePlanColumns.tsx`
- Modify: `apps/dispo/src/components/dispo/mobile/MobileShell.tsx` (placeholder swap will happen in Task 9 once `MobilePlanView` exists — for now, keep plan tab as placeholder)
- Modify: `apps/dispo/src/components/dispo/dispo.css`

---

- [ ] **Step 8.1: Create `MobilePlanColumns.tsx`**

Create `apps/dispo/src/components/dispo/mobile/MobilePlanColumns.tsx`:

```tsx
'use client'

import clsx from 'clsx'
import type { DispoCourt } from '@/lib/directus/courts'
import type { CourtBooking } from '@/lib/ebusy/reservations'
import {
  DAY_END,
  DAY_START,
  endMinutes,
  formatTime,
  groupColor,
  parseTime,
} from '@/lib/plan-helpers'
import type { DispoAssignment, DispoMatch } from '../types'

interface MobilePlanColumnsProps {
  courts: DispoCourt[]
  matches: DispoMatch[]
  assignments: DispoAssignment[]
  selectedId: string | null
  nowMinutes: number | null
  bookings: Map<number, CourtBooking[]>
  onSelectMatch: (matchId: string) => void
}

const PX_PER_MIN = 1.1
const COL_W = 56
const TIME_COL_W = 40
const HEADER_H = 36

export function MobilePlanColumns({
  courts,
  matches,
  assignments,
  selectedId,
  nowMinutes,
  bookings,
  onSelectMatch,
}: MobilePlanColumnsProps) {
  const totalMin = DAY_END - DAY_START
  const trackH = totalMin * PX_PER_MIN
  const matchById = new Map(matches.map((m) => [m.id, m]))

  const indoor = courts.filter((c) => c.type === 'tennis_indoor')
  const outdoor = courts.filter((c) => c.type === 'tennis_outdoor')
  const orderedCourts = [...indoor, ...outdoor]
  const splitIdx = indoor.length

  const hours: number[] = []
  for (let h = Math.floor(DAY_START / 60); h <= Math.floor(DAY_END / 60); h++) hours.push(h)

  const yForMinutes = (m: number) => (m - DAY_START) * PX_PER_MIN

  const blocksByCourt = new Map<number, Array<{ matchId: string; match: DispoMatch; start: number; end: number }>>()
  for (const a of assignments) {
    const match = matchById.get(a.matchId)
    if (!match) continue
    const start = parseTime(a.startTime)
    const end = endMinutes(a.startTime, a.durationH)
    for (const c of a.courtIds) {
      const list = blocksByCourt.get(c)
      const entry = { matchId: a.matchId, match, start, end }
      if (list) list.push(entry)
      else blocksByCourt.set(c, [entry])
    }
  }

  return (
    <div className="mobile-vtl">
      <div className="mobile-vtl-scroll">
        <div
          className="mobile-vtl-inner"
          style={{
            width: TIME_COL_W + orderedCourts.length * COL_W + (splitIdx > 0 ? 12 : 0) + 12,
            height: HEADER_H + trackH + 12,
          }}
        >
          <div className="mobile-vtl-header" style={{ height: HEADER_H }}>
            <div className="mobile-vtl-corner" style={{ width: TIME_COL_W }}>Zeit</div>
            {orderedCourts.map((c, i) => {
              const extraLeft = splitIdx > 0 && i === splitIdx ? 12 : 0
              const isIndoor = c.type === 'tennis_indoor'
              return (
                <div
                  key={c.id}
                  className={clsx('mobile-vtl-col-head', isIndoor && 'is-indoor')}
                  style={{ width: COL_W, marginLeft: extraLeft }}
                >
                  {isIndoor && <span className="indoor-dot" />}
                  <span>{c.name}</span>
                </div>
              )
            })}
          </div>

          <div className="mobile-vtl-body" style={{ height: trackH }}>
            <div className="mobile-vtl-time-col" style={{ width: TIME_COL_W, height: trackH }}>
              {hours.map((h) => (
                <div key={h} className="mobile-vtl-hour-label" style={{ top: yForMinutes(h * 60) }}>
                  {String(h).padStart(2, '0')}
                </div>
              ))}
            </div>

            {orderedCourts.map((c, i) => {
              const extraLeft = splitIdx > 0 && i === splitIdx ? 12 : 0
              const isIndoor = c.type === 'tennis_indoor'
              const blocks = blocksByCourt.get(c.id) ?? []
              return (
                <div
                  key={c.id}
                  className={clsx('mobile-vtl-col', isIndoor && 'is-indoor')}
                  style={{ width: COL_W, height: trackH, marginLeft: extraLeft }}
                >
                  {hours.map((h) => (
                    <div key={h} className="mobile-vtl-gridline" style={{ top: yForMinutes(h * 60) }} />
                  ))}
                  {(bookings.get(c.id) ?? []).map((bk, bi) => {
                    const start = Math.max(bk.fromMinutes, DAY_START)
                    const end = Math.min(bk.toMinutes, DAY_END)
                    if (end <= start) return null
                    return (
                      <div
                        key={`bk-${bi}`}
                        className="mobile-vtl-booking"
                        style={{ top: yForMinutes(start), height: (end - start) * PX_PER_MIN }}
                        title={`${formatTime(bk.fromMinutes)}–${formatTime(bk.toMinutes)}`}
                      />
                    )
                  })}
                  {blocks.map((b, bi) => {
                    const top = yForMinutes(b.start)
                    const height = (b.end - b.start) * PX_PER_MIN
                    const gc = groupColor(b.match.group || b.match.leagueShort || '')
                    const isSelected = selectedId === b.matchId
                    return (
                      <button
                        key={bi}
                        type="button"
                        className={clsx('mobile-vtl-block', isSelected && 'is-selected')}
                        style={{ top, height, background: gc.bg, color: gc.fg }}
                        onClick={() => onSelectMatch(b.matchId)}
                      >
                        <span className="mobile-vtl-block-time">{formatTime(b.start)}</span>
                        <span className="mobile-vtl-block-teams">
                          <strong>{b.match.homeTeamShort ?? b.match.homeTeam}</strong>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}

            {nowMinutes !== null && nowMinutes >= DAY_START && nowMinutes <= DAY_END && (
              <div
                className="mobile-vtl-now"
                style={{
                  top: yForMinutes(nowMinutes),
                  width: TIME_COL_W + orderedCourts.length * COL_W + (splitIdx > 0 ? 12 : 0),
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 8.2: Append mobile VTL CSS**

Append to `apps/dispo/src/components/dispo/dispo.css`:

```css
.dispo-root.dispo-root-mobile .mobile-vtl { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.dispo-root.dispo-root-mobile .mobile-vtl-scroll { flex: 1; overflow: auto; padding: 0 8px 12px; }
.dispo-root.dispo-root-mobile .mobile-vtl-inner { position: relative; }
.dispo-root.dispo-root-mobile .mobile-vtl-header { position: sticky; top: 0; z-index: 3; display: flex; background: var(--color-taupe-100); border-bottom: 1px solid var(--border-subtle); }
.dispo-root.dispo-root-mobile .mobile-vtl-corner { position: sticky; left: 0; z-index: 2; background: var(--color-taupe-100); border-right: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--fg-muted); }
.dispo-root.dispo-root-mobile .mobile-vtl-col-head { flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 3px; font-weight: 700; font-variant-numeric: tabular-nums; border-right: 1px solid color-mix(in oklch, black 5%, transparent); background: #fff; font-size: 11px; }
.dispo-root.dispo-root-mobile .mobile-vtl-col-head.is-indoor { background: color-mix(in oklch, var(--color-tcw-accent-200) 80%, white); }
.dispo-root.dispo-root-mobile .mobile-vtl-body { position: relative; display: flex; }
.dispo-root.dispo-root-mobile .mobile-vtl-time-col { position: sticky; left: 0; z-index: 2; flex-shrink: 0; background: var(--color-taupe-100); border-right: 1px solid var(--border-subtle); }
.dispo-root.dispo-root-mobile .mobile-vtl-hour-label { position: absolute; left: 0; right: 0; padding-right: 6px; text-align: right; font-size: 10px; color: var(--fg-muted); font-weight: 600; font-variant-numeric: tabular-nums; transform: translateY(-6px); }
.dispo-root.dispo-root-mobile .mobile-vtl-col { position: relative; flex-shrink: 0; background: #fff; border-right: 1px solid color-mix(in oklch, black 5%, transparent); }
.dispo-root.dispo-root-mobile .mobile-vtl-col.is-indoor { background: color-mix(in oklch, var(--color-tcw-accent-200) 40%, white); }
.dispo-root.dispo-root-mobile .mobile-vtl-gridline { position: absolute; left: 0; right: 0; height: 1px; background: color-mix(in oklch, black 5%, transparent); }
.dispo-root.dispo-root-mobile .mobile-vtl-booking { position: absolute; left: 0; right: 0; z-index: 0; background-image: repeating-linear-gradient(135deg, color-mix(in oklch, black 18%, transparent) 0 2px, transparent 2px 6px); }
.dispo-root.dispo-root-mobile .mobile-vtl-block { position: absolute; left: 2px; right: 2px; border-radius: 5px; padding: 3px 5px; overflow: hidden; display: flex; flex-direction: column; font-size: 10px; line-height: 1.15; border: 0; z-index: 1; text-align: left; }
.dispo-root.dispo-root-mobile .mobile-vtl-block.is-selected { box-shadow: 0 0 0 2px var(--color-tcw-red-500), 0 0 0 5px color-mix(in oklch, var(--color-tcw-red-500) 25%, transparent); z-index: 3; }
.dispo-root.dispo-root-mobile .mobile-vtl-block-time { font-weight: 700; font-variant-numeric: tabular-nums; opacity: 0.9; font-size: 9px; }
.dispo-root.dispo-root-mobile .mobile-vtl-block-teams { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dispo-root.dispo-root-mobile .mobile-vtl-now { position: absolute; left: 0; height: 2px; background: var(--color-tcw-red-500); z-index: 4; pointer-events: none; }
```

- [ ] **Step 8.3: Commit (incremental — no wiring yet)**

```bash
git add apps/dispo/src/components/dispo/mobile/MobilePlanColumns.tsx apps/dispo/src/components/dispo/dispo.css
git commit -m "feat(dispo): mobile plan columns (vertical timeline)"
```

---

## Task 9: Build `MobilePlanStrips` + `MobilePlanView` sub-toggle, wire into shell

**Files:**
- Create: `apps/dispo/src/components/dispo/mobile/MobilePlanStrips.tsx`
- Create: `apps/dispo/src/components/dispo/mobile/MobilePlanView.tsx`
- Modify: `apps/dispo/src/components/dispo/mobile/MobileShell.tsx`
- Modify: `apps/dispo/src/components/dispo/dispo.css`

---

- [ ] **Step 9.1: Create `MobilePlanStrips.tsx`**

Create `apps/dispo/src/components/dispo/mobile/MobilePlanStrips.tsx`:

```tsx
'use client'

import clsx from 'clsx'
import type { DispoCourt } from '@/lib/directus/courts'
import type { CourtBooking } from '@/lib/ebusy/reservations'
import {
  DAY_END,
  DAY_START,
  endMinutes,
  groupColor,
  parseTime,
  type PlanConflict,
} from '@/lib/plan-helpers'
import type { DispoAssignment, DispoMatch } from '../types'

interface MobilePlanStripsProps {
  courts: DispoCourt[]
  matches: DispoMatch[]
  assignments: DispoAssignment[]
  conflicts: PlanConflict[]
  bookings: Map<number, CourtBooking[]>
  onSelectMatch: (matchId: string) => void
}

export function MobilePlanStrips({
  courts,
  matches,
  assignments,
  conflicts,
  bookings,
  onSelectMatch,
}: MobilePlanStripsProps) {
  const matchById = new Map(matches.map((m) => [m.id, m]))
  const totalMin = DAY_END - DAY_START
  const pct = (m: number) => ((m - DAY_START) / totalMin) * 100

  const indoor = courts.filter((c) => c.type === 'tennis_indoor')
  const outdoor = courts.filter((c) => c.type === 'tennis_outdoor')
  const orderedCourts = [...indoor, ...outdoor]

  const assignmentsByCourt = new Map<number, DispoAssignment[]>()
  for (const a of assignments) {
    for (const c of a.courtIds) {
      const list = assignmentsByCourt.get(c)
      if (list) list.push(a)
      else assignmentsByCourt.set(c, [a])
    }
  }

  const conflictMatchIds = new Set<string>()
  for (const c of conflicts) {
    conflictMatchIds.add(c.matchIds[0])
    conflictMatchIds.add(c.matchIds[1])
  }

  const hourTicks: number[] = []
  for (let h = Math.floor(DAY_START / 60); h <= Math.floor(DAY_END / 60); h += 2) hourTicks.push(h)

  return (
    <div className="mobile-strips">
      <div className="mobile-strips-hours" aria-hidden>
        <div className="mobile-strips-hours-label" />
        <div className="mobile-strips-hours-rail">
          {hourTicks.map((h) => (
            <span key={h} style={{ left: `${pct(h * 60)}%` }}>{h}</span>
          ))}
        </div>
      </div>
      {orderedCourts.map((c) => {
        const list = assignmentsByCourt.get(c.id) ?? []
        const bks = bookings.get(c.id) ?? []
        const isIndoor = c.type === 'tennis_indoor'
        return (
          <div key={c.id} className={clsx('mobile-strip', isIndoor && 'is-indoor')}>
            <div className="mobile-strip-label">{c.name}</div>
            <div className="mobile-strip-rail">
              {bks.map((bk, i) => {
                const start = Math.max(bk.fromMinutes, DAY_START)
                const end = Math.min(bk.toMinutes, DAY_END)
                if (end <= start) return null
                return (
                  <span
                    key={`bk-${i}`}
                    className="mobile-strip-booking"
                    style={{ left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%` }}
                    title={`eBuSy ${bk.title ?? bk.bookingType}`}
                  />
                )
              })}
              {list.map((a) => {
                const match = matchById.get(a.matchId)
                if (!match) return null
                const start = parseTime(a.startTime)
                const end = endMinutes(a.startTime, a.durationH)
                const gc = groupColor(match.group || match.leagueShort || '')
                const inConflict = conflictMatchIds.has(a.matchId)
                return (
                  <button
                    key={a.matchId}
                    type="button"
                    className={clsx('mobile-strip-blk', inConflict && 'is-conflict')}
                    style={{
                      left: `${pct(start)}%`,
                      width: `${pct(end) - pct(start)}%`,
                      background: gc.bg,
                      color: gc.fg,
                    }}
                    onClick={() => onSelectMatch(a.matchId)}
                    title={`${match.homeTeamShort ?? match.homeTeam} vs. ${match.opponent}`}
                  >
                    <span className="mobile-strip-label-text">{match.homeTeamShort ?? match.homeTeam}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 9.2: Create `MobilePlanView.tsx`**

Create `apps/dispo/src/components/dispo/mobile/MobilePlanView.tsx`:

```tsx
'use client'

import clsx from 'clsx'
import { useState } from 'react'
import type { DispoState } from '../useDispoState'
import { MobilePlanColumns } from './MobilePlanColumns'
import { MobilePlanStrips } from './MobilePlanStrips'

type SubView = 'columns' | 'strips'

interface MobilePlanViewProps {
  state: DispoState
}

export function MobilePlanView({ state }: MobilePlanViewProps) {
  const [sub, setSub] = useState<SubView>('columns')

  return (
    <div className="mobile-plan-view">
      <div className="mobile-subtoggle" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={sub === 'columns'}
          className={clsx('mobile-subtoggle-btn', sub === 'columns' && 'is-active')}
          onClick={() => setSub('columns')}
        >
          Spalten
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sub === 'strips'}
          className={clsx('mobile-subtoggle-btn', sub === 'strips' && 'is-active')}
          onClick={() => setSub('strips')}
        >
          Streifen
        </button>
      </div>
      {sub === 'columns' && (
        <MobilePlanColumns
          courts={state.courts}
          matches={state.matches}
          assignments={state.assignments}
          selectedId={state.selectedId}
          nowMinutes={state.nowMinutes}
          bookings={state.bookings}
          onSelectMatch={state.selectMatch}
        />
      )}
      {sub === 'strips' && (
        <MobilePlanStrips
          courts={state.courts}
          matches={state.matches}
          assignments={state.assignments}
          conflicts={state.conflicts}
          bookings={state.bookings}
          onSelectMatch={state.selectMatch}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 9.3: Append CSS for sub-toggle + strips**

Append to `apps/dispo/src/components/dispo/dispo.css`:

```css
.dispo-root.dispo-root-mobile .mobile-plan-view { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.dispo-root.dispo-root-mobile .mobile-subtoggle {
  display: inline-flex;
  background: color-mix(in oklch, black 4%, transparent);
  border-radius: var(--radius-pill);
  padding: 3px;
  margin: 0 auto 10px;
  font-size: 12px;
}
.dispo-root.dispo-root-mobile .mobile-subtoggle-btn {
  border: 0;
  background: transparent;
  padding: 5px 14px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  color: var(--fg-muted);
}
.dispo-root.dispo-root-mobile .mobile-subtoggle-btn.is-active { background: var(--color-tcw-accent-900); color: #fff; }

.dispo-root.dispo-root-mobile .mobile-strips { display: flex; flex-direction: column; gap: 5px; padding: 4px 0 16px; }
.dispo-root.dispo-root-mobile .mobile-strips-hours { display: flex; align-items: center; font-size: 10px; color: var(--fg-muted); font-variant-numeric: tabular-nums; margin-bottom: 4px; }
.dispo-root.dispo-root-mobile .mobile-strips-hours-label { width: 32px; flex-shrink: 0; }
.dispo-root.dispo-root-mobile .mobile-strips-hours-rail { position: relative; flex: 1; height: 14px; }
.dispo-root.dispo-root-mobile .mobile-strips-hours-rail span { position: absolute; transform: translateX(-50%); }
.dispo-root.dispo-root-mobile .mobile-strip { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 6px 8px; }
.dispo-root.dispo-root-mobile .mobile-strip.is-indoor { background: color-mix(in oklch, var(--color-tcw-accent-200) 40%, white); }
.dispo-root.dispo-root-mobile .mobile-strip-label { width: 28px; flex-shrink: 0; font-size: 11px; font-weight: 700; color: var(--color-tcw-accent-900); font-variant-numeric: tabular-nums; }
.dispo-root.dispo-root-mobile .mobile-strip-rail { position: relative; flex: 1; height: 22px; background: color-mix(in oklch, black 4%, transparent); border-radius: 5px; overflow: hidden; }
.dispo-root.dispo-root-mobile .mobile-strip-blk {
  position: absolute;
  top: 1px; bottom: 1px;
  border: 0;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  padding: 0 6px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: left;
  line-height: 20px;
}
.dispo-root.dispo-root-mobile .mobile-strip-blk.is-conflict { box-shadow: 0 0 0 2px var(--color-tcw-red-500); }
.dispo-root.dispo-root-mobile .mobile-strip-booking {
  position: absolute;
  top: 1px; bottom: 1px;
  background-image: repeating-linear-gradient(135deg, color-mix(in oklch, black 35%, transparent) 0 2px, transparent 2px 5px);
  border-radius: 2px;
  pointer-events: none;
}
.dispo-root.dispo-root-mobile .mobile-strip-label-text { font-size: 10px; }
```

- [ ] **Step 9.4: Wire `MobilePlanView` into `MobileShell`**

In `apps/dispo/src/components/dispo/mobile/MobileShell.tsx`, replace the plan-tab placeholder:

```tsx
// add at top:
import { MobilePlanView } from './MobilePlanView'

// replace:
{tab === 'plan' && <div className="empty-hint">Plan view folgt in Task 8.</div>}
// with:
{tab === 'plan' && <MobilePlanView state={state} />}
```

- [ ] **Step 9.5: Verify**

Narrow viewport. Tab "Plan" → Spalten sub-view renders all courts as narrow columns with blocks; horizontal scroll works; tapping a block opens the editor sheet. Switch to "Streifen" → all courts on one screen, bars at correct X offsets, tapping a bar opens the editor. Conflicts glow red.

- [ ] **Step 9.6: Commit**

```bash
git add apps/dispo/src/components/dispo/
git commit -m "feat(dispo): mobile plan view with Spalten + Streifen sub-toggle"
```

---

## Task 10: Hide top-level `AdminHeader` on mobile below md

The page header + DayNavigator currently show on all viewports, duplicating the mobile top bar's date nav. Hide above the dispo shell on mobile only.

**Files:**
- Modify: `apps/dispo/src/app/day/[date]/page.tsx`

---

- [ ] **Step 10.1: Wrap the top `<main>` with a responsive hide below md**

In `apps/dispo/src/app/day/[date]/page.tsx`, find:

```tsx
<main className="mx-auto w-full max-w-7xl shrink-0 px-6 pt-6 pb-2">
  <AdminHeader ... />
  ...
</main>
```

Change `className` to hide on narrow viewports when the dispo shell is visible:

```tsx
<main className="mx-auto hidden w-full max-w-7xl shrink-0 px-6 pt-6 pb-2 md:block">
  <AdminHeader ... />
  ...
</main>
```

This hides the outer AdminHeader + banners on mobile. Banners (source errors, "no matches", etc.) are rare cases; if any of them matter on mobile, revisit in a follow-up. The `showDispo` branch still renders `DispoApp` (which has its own mobile shell on mobile).

Also, `showDispo === false` branches (tournament banner, no matches, missing courts) show *only inside the outer main* today. Mobile will see a blank screen for those days. Mitigate by rendering the outer `<main>` unconditionally (remove the `hidden md:block`) *when* `showDispo === false`, so the fallback banner is always visible:

Final form:

```tsx
<main
  className={clsx(
    'mx-auto w-full max-w-7xl shrink-0 px-6 pt-6 pb-2',
    showDispo && 'hidden md:block',
  )}
>
  <AdminHeader ... />
  ...
</main>
```

Add `import clsx from 'clsx'` at the top of `page.tsx` if not already present.

- [ ] **Step 10.2: Verify**

Day with matches (showDispo === true): mobile sees only the DispoApp mobile shell; desktop sees AdminHeader on top then DispoApp. Day without matches / tournament: both mobile and desktop see the AdminHeader + banner (DispoApp doesn't render).

- [ ] **Step 10.3: Commit**

```bash
git add apps/dispo/src/app/day/[date]/page.tsx
git commit -m "feat(dispo): hide top header on mobile when dispo shell is visible"
```

---

## Task 11: Update `apps/dispo/AGENTS.md`

Document the mobile architecture, breakpoint, component layout, and watch-outs.

**Files:**
- Modify: `apps/dispo/AGENTS.md`

---

- [ ] **Step 11.1: Add "Mobile shell" subsection under Architecture**

In `apps/dispo/AGENTS.md`, find the "Architecture" section and append after the last bullet of that section:

```markdown
### Mobile shell

- `useDispoState` (`src/components/dispo/useDispoState.ts`) is the single source of truth for assignment state. Both shells consume it; only the hook calls `/api/assignments`.
- Two shells are always mounted. Tailwind `md:` (768 px) toggles visibility:
  - `desktop/DesktopShell.tsx` — Header + Sidebar + MapView/VerticalTimeline, drag & drop, hover previews, resize handle, time cursor.
  - `mobile/MobileShell.tsx` — MobileTopBar + MobileTabs + MobileMatchList + MobileEditorSheet + MobilePlanView (Spalten / Streifen sub-toggle).
- Desktop-only CSS rules in `dispo.css` are scoped `.dispo-root.app` so they are inert on the mobile subtree. Mobile-only rules live under `.dispo-root.dispo-root-mobile`. Shared helpers (`.btn`, `.court-picker`, chips) stay at `.dispo-root`.
- `CourtPicker.tsx` is shared between both shells' editors; its parent is responsible for wiring `onChange` back to the hook's `toggleCourt` / `removeCourtFromAssignment`.
- When adding a new state action, extend `useDispoState` rather than either shell. Shells should never hold assignment state directly.
- Desktop shell owns ephemeral drag state (`draggingMatchId`); mobile has no drag and must not re-introduce it.

### Watch-outs when touching either shell

- **Bundle size.** Both shells ship in one bundle today. If mobile profiling shows it pays for desktop code meaningfully, wrap one shell in `next/dynamic` with SSR disabled — but do not trade off the flash-free CSS swap lightly.
- **Effect scope.** Hook effects (auto-save, now-ticker) run once regardless of visible shell — intentional. Shell-local effects must not assume their DOM exists; avoid `useLayoutEffect` against refs, prefer `useEffect` with null guards.
- **CSS leakage.** When adding a rule to `dispo.css`, ask which shell it applies to and scope accordingly: `.dispo-root.app .foo` for desktop-only, `.dispo-root.dispo-root-mobile .foo` for mobile-only, `.dispo-root .foo` for both.
- **Body scroll.** `MobileEditorSheet` locks `document.body.style.overflow` while open and restores it on unmount; any other component doing the same needs to cooperate to avoid stuck scroll locks.
```

- [ ] **Step 11.2: Commit**

```bash
git add apps/dispo/AGENTS.md
git commit -m "docs(dispo): document mobile shell architecture and watch-outs"
```

---

## Task 12: Final smoke test + manual verification

No code change — this is a checklist run in a real browser plus a real phone. Nothing ships without this.

**Files:** none.

---

- [ ] **Step 12.1: Full check suite**

```bash
pnpm --filter @tcw/dispo lint
pnpm --filter @tcw/dispo test
pnpm --filter @tcw/dispo build
```

All must pass. Build specifically catches stray import paths that tests miss.

- [ ] **Step 12.2: Desktop regression (≥1024 px viewport)**

On `http://localhost:3002/day/<match-day>` verify every item:

- [ ] Header view switch (Spalten / Lageplan) both render.
- [ ] Sidebar match cards render with stripes, groups, counts.
- [ ] Drag a match card onto a column / court zone → assignment created.
- [ ] Tap a chip in the picker → toggles court.
- [ ] Resize a VTL block → duration changes, auto-save fires.
- [ ] Drag a VTL block to another column → court moves.
- [ ] Remove chip on a VTL block → assignment updated / removed.
- [ ] Issues badge count matches real issues.
- [ ] Save status pill flips between Speichere … / Gespeichert · HH:MM.
- [ ] Alle Zuordnungen zurücksetzen button works (confirm dialog).

- [ ] **Step 12.3: Mobile smoke via DevTools responsive mode (≤375 px)**

- [ ] Desktop shell is hidden; mobile shell visible.
- [ ] Top bar: prev/next chevrons navigate days; date label shows; issues pill & save icon behave.
- [ ] Spiele tab: match list renders, tap card opens sheet.
- [ ] Sheet: chips toggle, start time changes, duration stepper works, conflicts list appears, backdrop + Escape dismiss.
- [ ] Tap a chip while sheet is open → chip flips, count badge updates, save icon goes Speichere → Gespeichert.
- [ ] Plan tab › Spalten: horizontal scroll through columns, blocks tap-open the sheet.
- [ ] Plan tab › Streifen: all courts stacked vertically, bars correct, tap opens sheet, conflicts show red halo.
- [ ] Issues pill → dropdown → tap issue → switches to Spiele, sheet opens on that match.

- [ ] **Step 12.4: Real phone smoke**

Open `http://<local-ip>:3002/day/<match-day>` on a phone on the same network (or connect via ngrok/Caddy). Tap every primary path from Steps 12.3. Verify no jank on the sheet slide-up, time input uses the native picker, horizontal scroll feels natural in Spalten.

- [ ] **Step 12.5: No commit — deliverable is verified manually**

If anything fails, open an issue / follow-up task. Do not paper over regressions by editing tests.

---

## Self-Review Checklist (plan author)

- **Spec coverage:** every section of `2026-04-24-dispo-mobile-design.md` has a task:
  - Render strategy (two shells, CSS swap) → Tasks 3, 4.
  - `useDispoState` contract → Task 1.
  - File layout → Tasks 1, 3, 4, 5, 6, 7, 8, 9.
  - `MobileTopBar` → Task 5.
  - `MobileTabs`, `MobileMatchList` → Task 6.
  - `MobileEditorSheet` → Task 7.
  - `MobilePlanColumns` → Task 8.
  - `MobilePlanStrips` + `MobilePlanView` → Task 9.
  - AdminHeader integration → Task 10.
  - AGENTS.md updates → Task 11.
  - Testing + manual verification → Task 12.
- **Placeholder scan:** no TBD / TODO / "implement later" / "similar to Task N" shortcuts.
- **Type consistency:** `DispoState`, `DispoAssignment`, `DispoMatch`, `Issue`, `PlanConflict`, `CourtBooking`, `BookingsByCourt` are used consistently across all tasks (types sourced from `./types`, `./useDispoState`, `@/lib/plan-helpers`, `@/lib/ebusy/reservations`, `@/lib/directus/courts`).
- **Naming:** hook actions match across tasks (`selectMatch`, `clearSelection`, `toggleCourt`, `dropMatchOnCourt`, `moveAssignmentCourt`, `removeCourtFromAssignment`, `updateAssignment`, `resetAssignments`, `setCursorMinutes`).

No inline fixes needed.
