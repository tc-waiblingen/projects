import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { DispoCourt } from '@/lib/directus/courts'
import { useDispoState } from '../useDispoState'
import type { DispoMatch } from '../types'

type Listener = (ev: MessageEvent) => void

class FakeEventSource {
  static last: FakeEventSource | null = null
  url: string
  private listeners = new Map<string, Set<Listener>>()
  closed = false
  constructor(url: string) {
    this.url = url
    FakeEventSource.last = this
  }
  addEventListener(name: string, cb: Listener) {
    let set = this.listeners.get(name)
    if (!set) {
      set = new Set()
      this.listeners.set(name, set)
    }
    set.add(cb)
  }
  removeEventListener(name: string, cb: Listener) {
    this.listeners.get(name)?.delete(cb)
  }
  close() {
    this.closed = true
  }
  dispatch(name: string, data: unknown) {
    const set = this.listeners.get(name)
    if (!set) return
    for (const cb of set) cb({ data: JSON.stringify(data) } as MessageEvent)
  }
}

function installFakeEventSource() {
  FakeEventSource.last = null
  ;(globalThis as unknown as { EventSource: typeof FakeEventSource }).EventSource = FakeEventSource
}

function uninstallFakeEventSource() {
  delete (globalThis as unknown as { EventSource?: unknown }).EventSource
}

const court = (id: number, type: 'tennis_indoor' | 'tennis_outdoor' = 'tennis_outdoor'): DispoCourt => ({
  id,
  name: type === 'tennis_indoor' ? `H${id}` : `P${id}`,
  type,
  sort: id,
  ebusyId: null,
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

describe('useDispoState — remote merge', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    installFakeEventSource()
  })
  afterEach(() => {
    uninstallFakeEventSource()
    vi.restoreAllMocks()
  })

  it('applies a remote update immediately when idle and populates recentlyChangedCells', async () => {
    const { result } = renderHook(() => useDispoState(baseProps()))
    await waitFor(() => expect(FakeEventSource.last).not.toBeNull())

    act(() => {
      FakeEventSource.last!.dispatch('update', {
        rows: [{ matchId: 'm1', matchTime: '09:00', courtIds: [3] }],
        plans: [{ matchId: 'm1', startTime: '09:00', durationH: 5.5 }],
        origin: 'other-tab',
        savedAt: Date.now(),
      })
    })

    expect(result.current.assignments).toEqual([
      { matchId: 'm1', courtIds: [3], startTime: '09:00', durationH: 5.5 },
    ])
    expect(result.current.recentlyChangedCells.has('m1:3')).toBe(true)
    expect(result.current.pendingRemoteSnapshot).toBeNull()
  })

  it('stashes a remote update as pending when the user has just edited', async () => {
    const { result } = renderHook(() => useDispoState(baseProps()))
    await waitFor(() => expect(FakeEventSource.last).not.toBeNull())

    act(() => result.current.dropMatchOnCourt('m1', 2))

    act(() => {
      FakeEventSource.last!.dispatch('update', {
        rows: [{ matchId: 'm1', matchTime: '09:00', courtIds: [4] }],
        plans: [{ matchId: 'm1', startTime: '09:00', durationH: 5.5 }],
        origin: 'other-tab',
        savedAt: Date.now(),
      })
    })

    expect(result.current.assignments[0]!.courtIds).toEqual([2])
    expect(result.current.pendingRemoteSnapshot).not.toBeNull()
    expect(result.current.pendingRemoteSnapshot!.assignments[0]!.courtIds).toEqual([4])
  })

  it('applyRemoteSnapshot applies the pending snapshot and clears it', async () => {
    const { result } = renderHook(() => useDispoState(baseProps()))
    await waitFor(() => expect(FakeEventSource.last).not.toBeNull())

    act(() => result.current.dropMatchOnCourt('m1', 2))
    act(() => {
      FakeEventSource.last!.dispatch('update', {
        rows: [{ matchId: 'm1', matchTime: '09:00', courtIds: [4] }],
        plans: [{ matchId: 'm1', startTime: '09:00', durationH: 5.5 }],
        origin: 'other-tab',
        savedAt: Date.now(),
      })
    })
    expect(result.current.pendingRemoteSnapshot).not.toBeNull()

    act(() => result.current.applyRemoteSnapshot())

    expect(result.current.assignments[0]!.courtIds).toEqual([4])
    expect(result.current.pendingRemoteSnapshot).toBeNull()
    expect(result.current.recentlyChangedCells.has('m1:4')).toBe(true)
  })

  it('ignores remote events that carry this tab’s own origin', async () => {
    const { result } = renderHook(() => useDispoState(baseProps()))
    await waitFor(() => expect(FakeEventSource.last).not.toBeNull())

    const mod = await import('../useAssignmentsStream')
    act(() => {
      FakeEventSource.last!.dispatch('update', {
        rows: [{ matchId: 'm1', matchTime: '09:00', courtIds: [3] }],
        plans: [{ matchId: 'm1', startTime: '09:00', durationH: 5.5 }],
        origin: mod.CLIENT_ID,
        savedAt: Date.now(),
      })
    })

    expect(result.current.assignments).toEqual([])
    expect(result.current.pendingRemoteSnapshot).toBeNull()
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
    vi.useRealTimers()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/assignments')
  })
})
