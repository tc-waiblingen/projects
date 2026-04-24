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

  const conflictMatchIdsByCourt = new Map<number, Set<string>>()
  for (const c of conflicts) {
    let set = conflictMatchIdsByCourt.get(c.courtId)
    if (!set) {
      set = new Set<string>()
      conflictMatchIdsByCourt.set(c.courtId, set)
    }
    set.add(c.matchIds[0])
    set.add(c.matchIds[1])
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
        const courtConflictMatchIds = conflictMatchIdsByCourt.get(c.id)
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
                const inConflict = courtConflictMatchIds?.has(a.matchId) ?? false
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
