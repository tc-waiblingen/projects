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
