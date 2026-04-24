'use client'

import clsx from 'clsx'
import { useState } from 'react'
import type { DispoCourt } from '@/lib/directus/courts'
import type { CourtBooking } from '@/lib/ebusy/reservations'
import {
  DAY_END,
  DAY_START,
  defaultDurationForCourtType,
  endMinutes,
  formatTime,
  groupColor,
  parseTime,
  snapTo30,
} from '@/lib/plan-helpers'
import type { DispoAssignment, DispoMatch } from '../types'

interface VerticalTimelineProps {
  courts: DispoCourt[]
  matches: DispoMatch[]
  assignments: DispoAssignment[]
  selectedId: string | null
  selectedMatchId: string | null
  selectedMatchAssignedCourtIds: number[]
  nowMinutes: number | null
  isDragging: boolean
  bookingsByCourt: Map<number, CourtBooking[]>
  onToggleCourt: (courtId: number) => void
  onSelectMatch: (matchId: string) => void
  onDropMatch: (matchId: string, courtId: number) => void
  onUpdateAssignment: (matchId: string, patch: Partial<DispoAssignment>) => void
  onMoveAssignmentCourt: (matchId: string, fromCourtId: number, toCourtId: number) => void
  onRemoveCourt: (matchId: string, courtId: number) => void
}

const PX_PER_MIN = 1.2
const COL_W = 78
const TIME_COL_W = 56
const HEADER_H = 44

export function VerticalTimeline({
  courts,
  matches,
  assignments,
  selectedId,
  selectedMatchId,
  selectedMatchAssignedCourtIds,
  nowMinutes,
  isDragging,
  bookingsByCourt,
  onToggleCourt,
  onSelectMatch,
  onDropMatch,
  onUpdateAssignment,
  onMoveAssignmentCourt,
  onRemoveCourt,
}: VerticalTimelineProps) {
  const totalMin = DAY_END - DAY_START
  const trackH = totalMin * PX_PER_MIN
  const matchById = new Map(matches.map((m) => [m.id, m]))
  const [hoverCourtId, setHoverCourtId] = useState<number | null>(null)
  const [movingFromCourtId, setMovingFromCourtId] = useState<number | null>(null)
  const anyDrag = isDragging || movingFromCourtId !== null
  const effectiveHoverCourtId = anyDrag ? hoverCourtId : null
  const selectedMatch = selectedMatchId ? matchById.get(selectedMatchId) ?? null : null
  const selectedAssignment = selectedMatchId
    ? assignments.find((a) => a.matchId === selectedMatchId) ?? null
    : null
  const selectedAssignedSet = new Set(selectedMatchAssignedCourtIds)

  const hours: number[] = []
  for (let h = Math.floor(DAY_START / 60); h <= Math.floor(DAY_END / 60); h++) hours.push(h)

  const yForMinutes = (m: number) => (m - DAY_START) * PX_PER_MIN

  // Indoor first, then outdoor (already sorted by sort within Directus fetcher)
  const indoor = courts.filter((c) => c.type === 'tennis_indoor')
  const outdoor = courts.filter((c) => c.type === 'tennis_outdoor')
  const orderedCourts = [...indoor, ...outdoor]
  const splitIdx = indoor.length

  const blocksByCourt = new Map<number, Array<{ matchId: string; match: DispoMatch; assignment: DispoAssignment; start: number; end: number }>>()
  for (const a of assignments) {
    const match = matchById.get(a.matchId)
    if (!match) continue
    const start = parseTime(a.startTime)
    const end = endMinutes(a.startTime, a.durationH)
    for (const c of a.courtIds) {
      const list = blocksByCourt.get(c)
      const entry = { matchId: a.matchId, match, assignment: a, start, end }
      if (list) list.push(entry)
      else blocksByCourt.set(c, [entry])
    }
  }

  function beginResize(e: React.MouseEvent, assignment: DispoAssignment) {
    e.stopPropagation()
    e.preventDefault()
    const startY = e.clientY
    const origEnd = endMinutes(assignment.startTime, assignment.durationH)
    const startMin = parseTime(assignment.startTime)

    function onMove(ev: MouseEvent) {
      const dy = ev.clientY - startY
      const dMin = dy / PX_PER_MIN
      let newEnd = origEnd + dMin
      if (newEnd < startMin + 60) newEnd = startMin + 60
      if (newEnd > DAY_END) newEnd = DAY_END
      newEnd = snapTo30(newEnd)
      const newDur = (newEnd - startMin) / 60
      onUpdateAssignment(assignment.matchId, { durationH: newDur })
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="vtl-view">
      <div className="vtl-scroll">
        <div
          className="vtl-inner"
          style={{
            width: TIME_COL_W + orderedCourts.length * COL_W + (splitIdx > 0 ? 12 : 0) + 12,
            height: HEADER_H + trackH + 12,
          }}
        >
          <div className="vtl-header" style={{ height: HEADER_H }}>
            <div className="vtl-corner" style={{ width: TIME_COL_W }}>
              Zeit
            </div>
            {orderedCourts.map((c, i) => {
              const extraLeft = splitIdx > 0 && i === splitIdx ? 12 : 0
              const isIndoor = c.type === 'tennis_indoor'
              const isAssignedToSelected = selectedAssignedSet.has(c.id)
              return (
                <div
                  key={c.id}
                  className={clsx('vtl-col-head', isIndoor && 'is-indoor', isAssignedToSelected && 'is-selected')}
                  style={{ width: COL_W, marginLeft: extraLeft }}
                  onClick={() => onToggleCourt(c.id)}
                  title={isIndoor ? 'Halle' : 'Außenplatz'}
                >
                  {isIndoor && <span className="indoor-dot" />}
                  <span>{c.name}</span>
                </div>
              )
            })}
          </div>

          <div className="vtl-body" style={{ height: trackH }}>
            <div className="vtl-time-col" style={{ width: TIME_COL_W, height: trackH }}>
              {hours.map((h) => (
                <div key={h} className="vtl-hour-label" style={{ top: yForMinutes(h * 60) }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {orderedCourts.map((c, i) => {
              const blocks = blocksByCourt.get(c.id) ?? []
              const extraLeft = splitIdx > 0 && i === splitIdx ? 12 : 0
              const isIndoor = c.type === 'tennis_indoor'
              const isHover = hoverCourtId === c.id
              const isAssignedToSelected = selectedAssignedSet.has(c.id)
              const showAddPreview =
                !anyDrag && selectedMatch !== null && isHover && !isAssignedToSelected
              return (
                <div
                  key={c.id}
                  className={clsx(
                    'vtl-col',
                    isIndoor && 'is-indoor',
                    isAssignedToSelected && 'is-selected',
                    isDragging && 'is-drop-target',
                    effectiveHoverCourtId === c.id && 'is-drag-over',
                  )}
                  style={{ width: COL_W, height: trackH, marginLeft: extraLeft }}
                  onMouseEnter={() => {
                    if (!anyDrag) setHoverCourtId(c.id)
                  }}
                  onMouseLeave={() => {
                    if (!anyDrag) setHoverCourtId((prev) => (prev === c.id ? null : prev))
                  }}
                  onDragEnter={(e) => {
                    if (e.dataTransfer.types.includes('application/x-match-id')) {
                      setHoverCourtId(c.id)
                    }
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget === e.target) {
                      setHoverCourtId((prev) => (prev === c.id ? null : prev))
                    }
                  }}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes('application/x-match-id')) {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      if (hoverCourtId !== c.id) setHoverCourtId(c.id)
                    }
                  }}
                  onDrop={(e) => {
                    const mid = e.dataTransfer.getData('application/x-match-id')
                    const fromRaw = e.dataTransfer.getData('application/x-from-court-id')
                    setHoverCourtId(null)
                    setMovingFromCourtId(null)
                    if (!mid) return
                    e.preventDefault()
                    const fromCourtId = fromRaw ? Number(fromRaw) : null
                    if (fromCourtId !== null && !Number.isNaN(fromCourtId)) {
                      onMoveAssignmentCourt(mid, fromCourtId, c.id)
                    } else {
                      onDropMatch(mid, c.id)
                    }
                  }}
                  onClick={(ev) => {
                    if (ev.target !== ev.currentTarget) return
                    if (selectedMatch) return
                    onToggleCourt(c.id)
                  }}
                >
                  {hours.map((h) => (
                    <div key={h} className="vtl-gridline" style={{ top: yForMinutes(h * 60) }} />
                  ))}
                  {(bookingsByCourt.get(c.id) ?? []).map((bk, bi) => {
                    const start = Math.max(bk.fromMinutes, DAY_START)
                    const end = Math.min(bk.toMinutes, DAY_END)
                    if (end <= start) return null
                    const label = bk.title ?? bk.bookingType
                    const range = `${formatTime(bk.fromMinutes)}–${formatTime(bk.toMinutes)}`
                    const tooltipParts = [range]
                    if (label) tooltipParts.push(label)
                    if (bk.blocking) tooltipParts.push('gesperrt')
                    return (
                      <div
                        key={`bk-${bi}`}
                        className="vtl-booking"
                        style={{ top: yForMinutes(start), height: (end - start) * PX_PER_MIN }}
                        title={tooltipParts.join(' · ')}
                      />
                    )
                  })}
                  {showAddPreview && selectedMatch && (() => {
                    const startTime = selectedAssignment?.startTime ?? selectedMatch.startTime
                    const durH = selectedAssignment?.durationH ?? defaultDurationForCourtType(c.type)
                    const startMin = parseTime(startTime)
                    const endMin = endMinutes(startTime, durH)
                    const top = yForMinutes(startMin)
                    const height = (endMin - startMin) * PX_PER_MIN
                    const gc = groupColor(selectedMatch.group || selectedMatch.leagueShort || '')
                    return (
                      <div
                        className="vtl-block vtl-block-preview"
                        style={{
                          top,
                          height,
                          background: `color-mix(in oklch, ${gc.bg} 55%, transparent)`,
                          color: gc.fg,
                        }}
                        title={`Klicken: ${selectedMatch.homeTeamShort ?? selectedMatch.homeTeam} auf diesem Platz zuteilen`}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          onToggleCourt(c.id)
                        }}
                      >
                        <span className="vtl-block-time">{formatTime(startMin)}</span>
                        <span className="vtl-block-match-group">
                          {selectedMatch.group || selectedMatch.leagueShort}
                        </span>
                        <span className="vtl-block-match-teams">
                          <strong>{selectedMatch.homeTeamShort ?? selectedMatch.homeTeam}</strong>
                          <span className="vs-thin">vs.</span>
                          {selectedMatch.opponent}
                        </span>
                      </div>
                    )
                  })()}
                  {blocks.map((b, bi) => {
                    const top = yForMinutes(b.start)
                    const height = (b.end - b.start) * PX_PER_MIN
                    const gc = groupColor(b.match.group || b.match.leagueShort || '')
                    const isBlockSelected = selectedId === b.matchId
                    return (
                      <div
                        key={bi}
                        className={clsx('vtl-block', isBlockSelected && 'is-selected')}
                        style={{ top, height, background: gc.bg, color: gc.fg }}
                        draggable
                        onDragStart={(ev) => {
                          ev.stopPropagation()
                          ev.dataTransfer.setData('application/x-match-id', b.matchId)
                          ev.dataTransfer.setData('application/x-from-court-id', String(c.id))
                          ev.dataTransfer.effectAllowed = 'move'
                          setMovingFromCourtId(c.id)
                        }}
                        onDragEnd={() => {
                          setMovingFromCourtId(null)
                          setHoverCourtId(null)
                        }}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          onSelectMatch(b.matchId)
                        }}
                        title={`${b.match.homeTeamShort ?? b.match.homeTeam} – ${b.match.opponent} · ${formatTime(b.start)}–${formatTime(b.end)} · ziehen zum Platz wechseln`}
                      >
                        <button
                          type="button"
                          className="vtl-block-remove"
                          aria-label="Zuordnung entfernen"
                          title="Zuordnung entfernen"
                          draggable={false}
                          onMouseDown={(ev) => ev.stopPropagation()}
                          onClick={(ev) => {
                            ev.stopPropagation()
                            onRemoveCourt(b.matchId, c.id)
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                        <span className="vtl-block-time">{formatTime(b.start)}</span>
                        <span className="vtl-block-match-group">
                          {b.match.group || b.match.leagueShort}
                        </span>
                        <span className="vtl-block-match-teams">
                          <strong>{b.match.homeTeamShort ?? b.match.homeTeam}</strong>
                          <span className="vs-thin">vs.</span>
                          {b.match.opponent}
                        </span>
                        <span
                          className="vtl-resize-handle"
                          onMouseDown={(ev) => beginResize(ev, b.assignment)}
                          title="Dauer anpassen"
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {nowMinutes !== null && nowMinutes >= DAY_START && nowMinutes <= DAY_END && (
              <div
                className="vtl-now"
                style={{
                  top: yForMinutes(nowMinutes),
                  width: TIME_COL_W + orderedCourts.length * COL_W + (splitIdx > 0 ? 12 : 0),
                }}
              >
                <div className="vtl-now-label">{formatTime(nowMinutes)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
