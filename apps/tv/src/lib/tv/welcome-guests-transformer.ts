/**
 * Welcome-guests data transformation for TV display.
 * Greets visiting match teams (window: −2h to +3h around start) and
 * tournament participants (play days before noon).
 */

import type { CalendarEvent, MatchEventMetadata, TournamentEventMetadata } from '@tcw/calendar'

const MATCH_BEFORE_MS = 2 * 60 * 60 * 1000
const MATCH_AFTER_MS = 3 * 60 * 60 * 1000

// All-day match fallback window (when startTime is missing)
const ALL_DAY_MATCH_START_HOUR = 8
const ALL_DAY_MATCH_END_HOUR = 18

const TOURNAMENT_CUTOFF_HOUR = 12

export interface MatchGreeting {
  id: string
  artikel: 'der' | 'des'
  guestClubName: string
  homeTeamShortName: string
  startTime: string | null
}

export interface TournamentGreeting {
  id: string
  title: string
  tournamentUrl: string | null
  callForEntriesUrl: string | null
}

export interface WelcomeGuestsData {
  matches: MatchGreeting[]
  tournament: TournamentGreeting | null
}

/**
 * Strip leading "TA " prefix (case-sensitive) from a guest team name.
 */
export function formatGuestClubName(name: string): string {
  return name.startsWith('TA ') ? name.slice(3) : name
}

/**
 * Select genitive article for the formatted club name.
 * "der" for SPG, TSG, or Aalener; otherwise "des".
 */
export function selectArtikel(formattedName: string): 'der' | 'des' {
  const trimmed = formattedName.trimStart()
  if (trimmed.startsWith('SPG ') || trimmed.startsWith('TSG ') || trimmed.startsWith('Aalener')) {
    return 'der'
  }
  return 'des'
}

function isSameLocalDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function toIsoLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseHHMM(time: string): { hours: number; minutes: number } | null {
  const m = time.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  return { hours: parseInt(m[1]!, 10), minutes: parseInt(m[2]!, 10) }
}

// TEMP: widen match greeting window for visual testing. Revert by setting to false.
export const WIDE_MATCH_WINDOW_FOR_TESTING = true
export const WIDE_MATCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Decide if a match event should be greeted right now.
 */
export function isMatchGreetingEligible(event: CalendarEvent, now: Date): boolean {
  if (event.source !== 'match') return false
  const meta = event.metadata as MatchEventMetadata
  if (!meta.isHome) return false
  if (meta.result && meta.result.trim() !== '') return false

  if (WIDE_MATCH_WINDOW_FOR_TESTING) {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime()
    const eventTime = event.startDate.getTime()
    return eventTime >= startOfToday && eventTime <= startOfToday + WIDE_MATCH_WINDOW_MS
  }

  if (!isSameLocalDate(event.startDate, now)) return false

  if (event.startTime) {
    const parsed = parseHHMM(event.startTime)
    if (!parsed) return false
    const start = new Date(event.startDate)
    start.setHours(parsed.hours, parsed.minutes, 0, 0)
    const diff = now.getTime() - start.getTime()
    return diff >= -MATCH_BEFORE_MS && diff <= MATCH_AFTER_MS
  }

  // All-day match: greet during daytime hours.
  const hour = now.getHours()
  return hour >= ALL_DAY_MATCH_START_HOUR && hour < ALL_DAY_MATCH_END_HOUR
}

/**
 * Decide if a tournament event should be greeted right now.
 */
export function isTournamentGreetingEligible(event: CalendarEvent, now: Date): boolean {
  if (event.source !== 'tournament') return false
  if (now.getHours() >= TOURNAMENT_CUTOFF_HOUR) return false

  const todayIso = toIsoLocalDate(now)

  if (event.playDates && event.playDates.length > 0) {
    return event.playDates.includes(todayIso)
  }

  const startIso = toIsoLocalDate(event.startDate)
  const endIso = event.endDate ? toIsoLocalDate(event.endDate) : startIso
  return todayIso >= startIso && todayIso <= endIso
}

function buildMatchGreeting(event: CalendarEvent): MatchGreeting | null {
  const meta = event.metadata as MatchEventMetadata
  const rawName = meta.opponentClub || meta.awayTeam
  const guestClubName = formatGuestClubName(rawName)
  const homeTeamShortName = meta.teamName || meta.group
  if (!homeTeamShortName) return null
  return {
    id: event.id,
    artikel: selectArtikel(guestClubName),
    guestClubName,
    homeTeamShortName,
    startTime: event.startTime,
  }
}

function buildTournamentGreeting(event: CalendarEvent): TournamentGreeting {
  const meta = event.metadata as TournamentEventMetadata
  return {
    id: event.id,
    title: event.title,
    tournamentUrl: meta.tournamentUrl ?? null,
    callForEntriesUrl: meta.callForEntriesUrl ?? null,
  }
}

/**
 * Transform calendar events into welcome-guests data for the given "now".
 * Returns empty arrays/null when nothing is eligible — caller skips the screen.
 */
export function transformWelcomeGuestsForTv(events: CalendarEvent[], now: Date = new Date()): WelcomeGuestsData {
  const matches = events
    .filter((e) => isMatchGreetingEligible(e, now))
    .map(buildMatchGreeting)
    .filter((g): g is MatchGreeting => g !== null)
    .sort((a, b) => a.homeTeamShortName.localeCompare(b.homeTeamShortName, 'de-DE'))

  const tournamentEvent = events.find((e) => isTournamentGreetingEligible(e, now)) ?? null
  const tournament = tournamentEvent ? buildTournamentGreeting(tournamentEvent) : null

  return { matches, tournament }
}
