import type { CalendarEvent, MatchEventMetadata } from './types'
import { getDateKey, getMonthKey } from './grouping'
import { isTournamentEvent } from './event-predicates'
import { eventActiveDays } from './active-days'

const SMALL_TEAM_PATTERNS = [/staffel/i, /kids/i, /talentiade/i, /doppelrunde/i]

export function getCourtCount(leagueName: string): number {
  return SMALL_TEAM_PATTERNS.some((p) => p.test(leagueName)) ? 2 : 3
}

export function getPlayerCount(courts: number): number {
  return courts * 4
}

export function getSeasonCourtType(date: Date): 'tennis_indoor' | 'tennis_outdoor' {
  const month = date.getMonth()
  const day = date.getDate()
  if (month >= 4 && month <= 7) return 'tennis_outdoor'
  if (month === 8 && day <= 22) return 'tennis_outdoor'
  return 'tennis_indoor'
}

export function getMatchCourtType(
  meta: MatchEventMetadata
): 'tennis_indoor' | 'tennis_outdoor' {
  return meta.season?.toLowerCase().includes('winter')
    ? 'tennis_indoor'
    : 'tennis_outdoor'
}

export function getHeatLevel(
  courtsUsed: number,
  courtsAvailable: number
): 'low' | 'medium' | 'high' {
  if (courtsAvailable === 0) return 'high'
  const ratio = courtsUsed / courtsAvailable
  if (ratio > 0.66) return 'high'
  if (ratio >= 0.33) return 'medium'
  return 'low'
}

export interface CourtUsageEntry {
  time: string
  courts: number
  players: number
  league: string
  leagueUrl: string | null
  teamName: string
  opponent: string
}

export interface TournamentUsageEntry {
  title: string
  url: string | null
  courts: number
}

export interface CourtUsageHalf {
  courts: number
  teams: number
  players: number
  entries: CourtUsageEntry[]
}

export interface CourtUsageDay {
  dateKey: string
  date: Date
  courtType: 'tennis_indoor' | 'tennis_outdoor'
  totalCourtsAvailable: number
  am: CourtUsageHalf
  pm: CourtUsageHalf
  tournament: TournamentUsageEntry | null
  heatLevel: 'low' | 'medium' | 'high'
}

export interface CourtUsageMonth {
  monthKey: string
  monthDate: Date
  courtType: 'tennis_indoor' | 'tennis_outdoor'
  totalCourtsAvailable: number
  days: CourtUsageDay[]
}

export interface CourtUsageConfig {
  events: CalendarEvent[]
  indoorCourtCount: number
  outdoorCourtCount: number
  year: number
}

function emptyHalf(): CourtUsageHalf {
  return { courts: 0, teams: 0, players: 0, entries: [] }
}

export function computeCourtUsage(config: CourtUsageConfig): CourtUsageMonth[] {
  const { events, indoorCourtCount, outdoorCourtCount, year } = config

  const daysMap = new Map<string, CourtUsageDay>()

  for (const event of events) {
    const dateKey = getDateKey(event.startDate)

    if (isTournamentEvent(event)) {
      for (const current of eventActiveDays(event)) {
        const dayCourtType = getSeasonCourtType(current)
        const dayAvailable = dayCourtType === 'tennis_indoor' ? indoorCourtCount : outdoorCourtCount
        const dayKey = getDateKey(current)

        let day = daysMap.get(dayKey)
        if (!day) {
          day = {
            dateKey: dayKey,
            date: new Date(current),
            courtType: dayCourtType,
            totalCourtsAvailable: dayAvailable,
            am: emptyHalf(),
            pm: emptyHalf(),
            tournament: null,
            heatLevel: 'high',
          }
          daysMap.set(dayKey, day)
        }
        day.tournament = { title: event.title, url: event.url, courts: dayAvailable }
        day.heatLevel = 'high'
      }
      continue
    }

    if (event.source !== 'match') continue
    const meta = event.metadata as MatchEventMetadata
    if (!meta.isHome) continue

    const courtType = getMatchCourtType(meta)
    const totalCourtsAvailable =
      courtType === 'tennis_indoor' ? indoorCourtCount : outdoorCourtCount

    const league = meta.leagueFull || meta.league || ''
    const courts = getCourtCount(meta.group || league)
    const players = getPlayerCount(courts)
    const time = event.startTime || '00:00'
    const isAm = time < '12:00'

    const entry: CourtUsageEntry = {
      time,
      courts,
      players,
      league,
      leagueUrl: meta.leagueUrl || null,
      teamName: meta.homeTeam,
      opponent: meta.awayTeam,
    }

    let day = daysMap.get(dateKey)
    if (!day) {
      day = {
        dateKey,
        date: new Date(event.startDate),
        courtType,
        totalCourtsAvailable,
        am: emptyHalf(),
        pm: emptyHalf(),
        tournament: null,
        heatLevel: 'low',
      }
      daysMap.set(dateKey, day)
    }

    const half = isAm ? day.am : day.pm
    half.entries.push(entry)
    half.courts += courts
    half.teams += 1
    half.players += players
  }

  for (const day of daysMap.values()) {
    day.am.entries.sort((a, b) => a.time.localeCompare(b.time))
    day.pm.entries.sort((a, b) => a.time.localeCompare(b.time))
    if (!day.tournament) {
      const totalCourts = day.am.courts + day.pm.courts
      day.heatLevel = getHeatLevel(totalCourts, day.totalCourtsAvailable)
    }
  }

  // Build all 12 months for the year
  const months: CourtUsageMonth[] = []
  for (let m = 0; m < 12; m++) {
    const monthDate = new Date(year, m, 1)
    const courtType = getSeasonCourtType(monthDate)
    const totalCourtsAvailable = courtType === 'tennis_indoor' ? indoorCourtCount : outdoorCourtCount
    const monthKey = getMonthKey(monthDate)

    months.push({
      monthKey,
      monthDate,
      courtType,
      totalCourtsAvailable,
      days: [],
    })
  }

  // Assign days to their months
  for (const day of daysMap.values()) {
    const monthKey = getMonthKey(day.date)
    const month = months.find((m) => m.monthKey === monthKey)
    if (month) {
      month.days.push(day)
    }
  }

  // Sort days within each month
  for (const month of months) {
    month.days.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  }

  return months
}
