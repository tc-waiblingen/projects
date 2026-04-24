import {
  eventActiveDays,
  fetchClubEvents,
  fetchMatches,
  fetchTournaments,
  isTournamentEvent,
  type CalendarEvent,
  type MatchEventMetadata,
  type TournamentEventMetadata,
} from '@tcw/calendar'
import { getCalendarConfig } from './calendar-config'
import { dateKey } from './format'
import { withCache } from './match-cache'

export interface DayMatch {
  id: string
  startTime: string
  homeTeam: string
  homeTeamShort: string | null
  opponent: string
  league: string
  leagueShort: string
  leagueUrl: string | null
  group: string
}

export interface DayTournament {
  id: string
  title: string
  url: string | null
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function toDayMatch(event: CalendarEvent): DayMatch | null {
  if (event.source !== 'match') return null
  const meta = event.metadata as MatchEventMetadata
  if (!meta.isHome) return null
  return {
    id: event.id,
    startTime: event.startTime || '00:00',
    homeTeam: meta.homeTeam,
    homeTeamShort: meta.teamName || null,
    opponent: meta.awayTeam,
    league: meta.leagueFull || meta.league || '',
    leagueShort: meta.league || '',
    leagueUrl: meta.leagueUrl || null,
    group: meta.group || '',
  }
}

export async function fetchMatchesForDate(date: Date): Promise<DayMatch[]> {
  const key = dateKey(date)
  return withCache(`matches:${key}`, async () => {
    const events = await fetchMatches(getCalendarConfig(), {
      from: startOfDay(date),
      to: endOfDay(date),
    })
    return events
      .map(toDayMatch)
      .filter((m): m is DayMatch => m !== null)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  })
}

export async function fetchTournamentForDate(date: Date): Promise<DayTournament | null> {
  const key = dateKey(date)
  return withCache(`tournament:${key}`, async () => {
    const range = { from: startOfDay(date), to: endOfDay(date) }
    const [nrTournaments, clubEvents] = await Promise.all([
      fetchTournaments(getCalendarConfig(), range),
      fetchClubEvents(getCalendarConfig(), range),
    ])
    const target = dateKey(date)
    const t = [...nrTournaments, ...clubEvents].find(
      (ev) => isTournamentEvent(ev) && eventActiveDays(ev).some((d) => dateKey(d) === target),
    )
    if (!t) return null
    const meta = t.metadata as TournamentEventMetadata | undefined
    return {
      id: t.id,
      title: t.title,
      url: t.url || (meta && 'url' in meta ? (meta as { url?: string }).url || null : null),
    }
  })
}

export async function fetchAllEventsForYear(year: number): Promise<CalendarEvent[]> {
  return withCache(`year:${year}`, async () => {
    const from = new Date(year, 0, 1)
    const to = new Date(year, 11, 31, 23, 59, 59)
    const [matches, tournaments, clubEvents] = await Promise.all([
      fetchMatches(getCalendarConfig(), { from, to }),
      fetchTournaments(getCalendarConfig(), { from, to }),
      fetchClubEvents(getCalendarConfig(), { from, to }),
    ])
    return [...matches, ...tournaments, ...clubEvents]
  })
}
