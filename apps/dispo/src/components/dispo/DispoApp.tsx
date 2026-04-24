'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DispoCourt } from '@/lib/directus/courts'
import { bookingsFromRecord, type BookingsByCourt } from '@/lib/ebusy/reservations'
import {
  computeOccupancy,
  defaultDurationForCourtType,
  detectConflicts,
  type PlanConflict,
  parseTime,
} from '@/lib/plan-helpers'
import { Header } from './Header'
import { Legend } from './Legend'
import { MapView } from './MapView'
import { Sidebar } from './Sidebar'
import { TimeSlider } from './TimeSlider'
import { VerticalTimeline } from './VerticalTimeline'
import type { DispoAssignment, DispoMatch, DispoView, Issue } from './types'
import { DAY_END, DAY_START } from '@/lib/plan-helpers'
import './dispo.css'

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

interface DispoAppProps {
  date: string
  courts: DispoCourt[]
  matches: DispoMatch[]
  initialAssignments: DispoAssignment[]
  recentChangeMatchIds: string[]
  lageplanSvg: string | null
  bookingsByCourt: BookingsByCourt
}

export function DispoApp({
  date,
  courts,
  matches,
  initialAssignments,
  recentChangeMatchIds,
  lageplanSvg,
  bookingsByCourt,
}: DispoAppProps) {
  const [assignments, setAssignments] = useState<DispoAssignment[]>(initialAssignments)
  const [view, setView] = useState<DispoView>('vtimeline')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cursorMinutes, setCursorMinutes] = useState<number>(() => {
    if (initialAssignments.length > 0) return parseTime(initialAssignments[0]!.startTime) + 60
    if (matches.length > 0) return parseTime(matches[0]!.startTime) + 60
    return Math.round((DAY_START + DAY_END) / 2)
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [draggingMatchId, setDraggingMatchId] = useState<string | null>(null)

  const recentChangeIdSet = useMemo(() => new Set(recentChangeMatchIds), [recentChangeMatchIds])
  const bookingsMap = useMemo(() => bookingsFromRecord(bookingsByCourt), [bookingsByCourt])
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

  // --- Persistence ---
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

  // --- Mutations ---
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

  const selectMatch = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedId(null)
  }, [])

  const handleDragStartMatch = useCallback((e: React.DragEvent, matchId: string) => {
    e.dataTransfer.setData('application/x-match-id', matchId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingMatchId(matchId)
  }, [])

  const handleDragEndMatch = useCallback(() => {
    setDraggingMatchId(null)
  }, [])

  const resetAssignments = useCallback(() => {
    if (typeof window !== 'undefined' && !window.confirm('Alle Zuordnungen zurücksetzen?')) return
    setAssignments([])
    setSelectedId(null)
  }, [])

  const isDragging = draggingMatchId !== null
  const selectedMatchAssignedCourtIds = highlightCourtIds
  const mapProps = {
    svg: lageplanSvg,
    courts,
    matches,
    occupancy,
    highlightCourtIds,
    selectedMatchId: selectedId,
    selectedMatchAssignedCourtIds,
    isDragging,
    onToggleCourt: toggleCourt,
    onSelectMatch: selectMatch,
    onDropMatch: dropMatchOnCourt,
    bookingsByCourt: bookingsMap,
  }

  const nowMinutes = useNowMinutesForDate(date)

  const vtlProps = {
    courts,
    matches,
    assignments,
    selectedId,
    selectedMatchId: selectedId,
    selectedMatchAssignedCourtIds,
    nowMinutes,
    isDragging,
    onToggleCourt: toggleCourt,
    onSelectMatch: selectMatch,
    onDropMatch: dropMatchOnCourt,
    onUpdateAssignment: updateAssignment,
    onMoveAssignmentCourt: moveAssignmentCourt,
    onRemoveCourt: removeCourtFromAssignment,
    bookingsByCourt: bookingsMap,
  }

  return (
    <div className="dispo-root app density-compact map-style-lageplan">
      <Header
        view={view}
        onViewChange={setView}
        issues={issues}
        onIssueSelect={selectMatch}
        saving={saving}
        saveError={saveError}
        savedAt={savedAt}
      />

      <div className="app-body">
        <Sidebar
          matches={matches}
          assignments={assignments}
          selectedId={selectedId}
          recentChangeMatchIds={recentChangeIdSet}
          onSelectMatch={selectMatch}
          onClearSelection={clearSelection}
          onDragStartMatch={handleDragStartMatch}
          onDragEndMatch={handleDragEndMatch}
          onResetAssignments={resetAssignments}
        />

        <div className="canvas-with-details">
          <main className="canvas">
            {view === 'map' && (
              <>
                <MapView {...mapProps} />
                <div className="map-cursor-ctrl">
                  <TimeSlider
                    value={cursorMinutes}
                    onChange={setCursorMinutes}
                    nowMinutes={nowMinutes}
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
