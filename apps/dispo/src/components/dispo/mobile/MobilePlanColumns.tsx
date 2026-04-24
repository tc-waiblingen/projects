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
