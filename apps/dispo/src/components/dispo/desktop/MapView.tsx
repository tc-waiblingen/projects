'use client'

import clsx from 'clsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DispoCourt } from '@/lib/directus/courts'
import type { CourtBooking } from '@/lib/ebusy/reservations'
import { abbreviateTeam, formatTime, groupColor, type OccupancyEntry } from '@/lib/plan-helpers'
import type { DispoMatch } from '../types'

interface CourtRect {
  x: number
  y: number
  width: number
  height: number
}

interface MapViewProps {
  svg: string | null
  courts: DispoCourt[]
  matches: DispoMatch[]
  occupancy: Map<number, OccupancyEntry>
  highlightCourtIds: number[]
  selectedMatchId: string | null
  selectedMatchAssignedCourtIds: number[]
  isDragging: boolean
  bookingsByCourt: Map<number, CourtBooking[]>
  onToggleCourt: (courtId: number) => void
  onSelectMatch: (matchId: string) => void
  onDropMatch: (matchId: string, courtId: number) => void
  showLabels?: boolean
}

export function MapView({
  svg,
  courts,
  matches,
  occupancy,
  highlightCourtIds,
  selectedMatchId,
  selectedMatchAssignedCourtIds,
  isDragging,
  bookingsByCourt,
  onToggleCourt,
  onSelectMatch,
  onDropMatch,
  showLabels = true,
}: MapViewProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Map<number, CourtRect>>(new Map())
  const [hoverCourtId, setHoverCourtId] = useState<number | null>(null)
  const [openBookingsCourtId, setOpenBookingsCourtId] = useState<number | null>(null)
  const matchById = new Map(matches.map((m) => [m.id, m]))
  const effectiveHoverCourtId = isDragging ? hoverCourtId : null
  const selectedMatch = selectedMatchId ? matchById.get(selectedMatchId) ?? null : null
  const selectedGroupColor = selectedMatch
    ? groupColor(selectedMatch.group || selectedMatch.leagueShort || '')
    : null
  const selectedAssignedSet = new Set(selectedMatchAssignedCourtIds)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !svg) return
    const parser = new DOMParser()
    const doc = parser.parseFromString(svg, 'image/svg+xml')
    const svgNode = doc.documentElement
    if (!svgNode || svgNode.tagName.toLowerCase() !== 'svg') return
    host.replaceChildren(svgNode)
  }, [svg])

  const measure = useCallback(() => {
    const host = hostRef.current
    if (!host) return
    const svgEl = host.querySelector('svg')
    if (!svgEl) return
    const hostRect = host.getBoundingClientRect()
    const next = new Map<number, CourtRect>()
    const missing: string[] = []
    for (const court of courts) {
      const selectors = [
        `#${CSS.escape(court.name)}`,
        `[id="${court.name}"]`,
        `[data-name="${court.name}"]`,
      ]
      let element: Element | null = null
      for (const selector of selectors) {
        try {
          element = svgEl.querySelector(selector)
          if (element) break
        } catch {
          // ignore invalid selector
        }
      }
      if (!element) {
        missing.push(court.name)
        continue
      }
      const rect = element.getBoundingClientRect()
      next.set(court.id, {
        x: rect.left - hostRect.left,
        y: rect.top - hostRect.top,
        width: rect.width,
        height: rect.height,
      })
    }
    if (missing.length > 0) {
      console.warn('MapView: no SVG element found for courts', missing)
    }
    setPositions(next)
  }, [courts])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !svg) return
    const t = setTimeout(measure, 120)
    const ro = new ResizeObserver(() => measure())
    ro.observe(host)
    return () => {
      clearTimeout(t)
      ro.disconnect()
    }
  }, [measure, svg])

  useEffect(() => {
    if (openBookingsCourtId === null) return
    function onDocClick(ev: MouseEvent) {
      const target = ev.target as Element | null
      if (target && target.closest('.court-booking-indicator')) return
      setOpenBookingsCourtId(null)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [openBookingsCourtId])

  if (!svg) {
    return (
      <div className="map-view">
        <div className="map-fallback">
          <strong>Lageplan nicht konfiguriert</strong>
          <span>Im Directus unter „global › area_map“ eine SVG-Datei hinterlegen.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="map-view">
      <div ref={hostRef} className="map-svg-host" />
      <div className="map-overlay">
        {courts.map((court) => {
          const rect = positions.get(court.id)
          if (!rect) return null
          const occ = occupancy.get(court.id)
          const isHighlighted = highlightCourtIds.includes(court.id)
          const isPortrait = rect.height > rect.width
          const gc = occ ? groupColor(occ.group) : null
          const match = occ ? matchById.get(occ.matchId) : null
          const isHover = hoverCourtId === court.id
          const showAddPreview =
            !isDragging &&
            selectedMatch !== null &&
            selectedGroupColor !== null &&
            isHover &&
            !selectedAssignedSet.has(court.id) &&
            (!occ || occ.matchId !== selectedMatchId)
          const showRemovePreview =
            !isDragging &&
            selectedMatch !== null &&
            isHover &&
            selectedAssignedSet.has(court.id)
          let background: string | undefined = gc ? gc.bg : 'oklch(95% 0.016 86 / 0.55)'
          let color: string | undefined = gc ? gc.fg : undefined
          if (showAddPreview && selectedGroupColor) {
            background = `color-mix(in oklch, ${selectedGroupColor.bg} 55%, transparent)`
            color = selectedGroupColor.fg
          }
          return (
            <div
              key={court.id}
              className={clsx(
                'court-zone',
                isHighlighted && 'is-highlighted',
                isPortrait && 'is-portrait',
                isDragging && 'is-drop-target',
                effectiveHoverCourtId === court.id && 'is-drag-over',
                showAddPreview && 'is-preview-add',
                showRemovePreview && 'is-preview-remove',
              )}
              data-occupied={occ ? 'true' : 'false'}
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                background,
                color,
              }}
              onClick={(e) => {
                e.stopPropagation()
                if (selectedMatchId && !selectedAssignedSet.has(court.id) && (!occ || occ.matchId !== selectedMatchId)) {
                  // Match selected → add court (regardless of what currently occupies it)
                  onToggleCourt(court.id)
                  return
                }
                if (selectedMatchId && selectedAssignedSet.has(court.id)) {
                  // Match selected and this court is its → remove
                  onToggleCourt(court.id)
                  return
                }
                if (occ) onSelectMatch(occ.matchId)
                else onToggleCourt(court.id)
              }}
              onMouseEnter={() => {
                if (!isDragging) setHoverCourtId(court.id)
              }}
              onMouseLeave={() => {
                if (!isDragging) setHoverCourtId((prev) => (prev === court.id ? null : prev))
              }}
              onDragEnter={(e) => {
                if (e.dataTransfer.types.includes('application/x-match-id')) {
                  setHoverCourtId(court.id)
                }
              }}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) {
                  setHoverCourtId((prev) => (prev === court.id ? null : prev))
                }
              }}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('application/x-match-id')) {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (hoverCourtId !== court.id) setHoverCourtId(court.id)
                }
              }}
              onDrop={(e) => {
                const mid = e.dataTransfer.getData('application/x-match-id')
                setHoverCourtId(null)
                if (!mid) return
                e.preventDefault()
                onDropMatch(mid, court.id)
              }}
              title={
                showAddPreview && selectedMatch
                  ? `Klicken: ${selectedMatch.homeTeamShort ?? selectedMatch.homeTeam} → Platz ${court.name} zuteilen`
                  : showRemovePreview && selectedMatch
                    ? `Klicken: ${selectedMatch.homeTeamShort ?? selectedMatch.homeTeam} von Platz ${court.name} entfernen`
                    : match
                      ? `${match.homeTeamShort ?? match.homeTeam} vs. ${match.opponent}`
                      : court.name
              }
            >
              {showLabels && (
                <div className="court-labels">
                  <span className="court-label">{court.name}</span>
                  {showAddPreview && selectedMatch && (
                    <span className="court-occupant">{abbreviateTeam(selectedMatch.homeTeamShort, selectedMatch.group || selectedMatch.leagueShort || '')}</span>
                  )}
                  {!showAddPreview && occ && match && (
                    <span className="court-occupant">{abbreviateTeam(match.homeTeamShort, match.group || match.leagueShort || '')}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {courts.map((court) => {
          const rect = positions.get(court.id)
          if (!rect) return null
          const bookings = bookingsByCourt.get(court.id)
          if (!bookings || bookings.length === 0) return null
          const isOpen = openBookingsCourtId === court.id
          const rangesText = bookings
            .map((b) => `${formatTime(b.fromMinutes)}–${formatTime(b.toMinutes)}`)
            .join(', ')
          return (
            <div
              key={`bk-${court.id}`}
              className="court-booking-indicator"
              style={{ left: rect.x + rect.width - 14, top: rect.y + 4 }}
            >
              <button
                type="button"
                className={clsx('court-booking-dot', isOpen && 'is-open')}
                aria-label={`Buchungen auf ${court.name}: ${rangesText}`}
                title={rangesText}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenBookingsCourtId((prev) => (prev === court.id ? null : court.id))
                }}
              />
              {isOpen && (
                <div className="court-booking-popover" role="dialog">
                  <div className="court-booking-popover-title">{court.name} — Buchungen</div>
                  <ul>
                    {bookings.map((b, i) => {
                      const label = b.title ?? b.bookingType
                      return (
                        <li key={i}>
                          <span className="court-booking-time">
                            {formatTime(b.fromMinutes)}–{formatTime(b.toMinutes)}
                          </span>
                          {label && <span className="court-booking-label">{label}</span>}
                          {b.blocking && <span className="court-booking-blocking">gesperrt</span>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
