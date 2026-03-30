import type { CalendarEvent, MatchEventMetadata } from './types'
import { getDateKey, getMonthKey } from './grouping'

const SMALL_TEAM_PATTERNS = [/staffel/i, /kids/i, /talentiade/i]

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
  teamName: string
  opponent: string
}

export interface TournamentUsageEntry {
  title: string
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
}

function emptyHalf(): CourtUsageHalf {
  return { courts: 0, teams: 0, players: 0, entries: [] }
}

export function computeCourtUsage(config: CourtUsageConfig): CourtUsageMonth[] {
  const { events, indoorCourtCount, outdoorCourtCount } = config

  const daysMap = new Map<string, CourtUsageDay>()

  for (const event of events) {
    const courtType = getSeasonCourtType(event.startDate)
    const totalCourtsAvailable = courtType === 'tennis_indoor' ? indoorCourtCount : outdoorCourtCount
    const dateKey = getDateKey(event.startDate)

    if (event.source === 'tournament') {
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
          heatLevel: 'high',
        }
        daysMap.set(dateKey, day)
      }
      day.tournament = { title: event.title, courts: totalCourtsAvailable }
      day.heatLevel = 'high'
      continue
    }

    if (event.source !== 'match') continue
    const meta = event.metadata as MatchEventMetadata
    if (!meta.isHome) continue

    const league = meta.leagueFull || meta.league || ''
    const courts = getCourtCount(league)
    const players = getPlayerCount(courts)
    const time = event.startTime || '00:00'
    const isAm = time < '12:00'

    const entry: CourtUsageEntry = {
      time,
      courts,
      players,
      league,
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

  const monthsMap = new Map<string, CourtUsageMonth>()
  for (const day of daysMap.values()) {
    const monthKey = getMonthKey(day.date)
    let month = monthsMap.get(monthKey)
    if (!month) {
      month = {
        monthKey,
        monthDate: new Date(day.date.getFullYear(), day.date.getMonth(), 1),
        courtType: day.courtType,
        totalCourtsAvailable: day.totalCourtsAvailable,
        days: [],
      }
      monthsMap.set(monthKey, month)
    }
    month.days.push(day)
  }

  return Array.from(monthsMap.values())
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((month) => ({
      ...month,
      days: month.days.sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    }))
}
