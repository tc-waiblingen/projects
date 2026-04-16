/**
 * Match results data transformation for TV display.
 * Filters recent matches, determines winners.
 */

import type { CalendarEvent, MatchEventMetadata } from '@tcw/calendar'
import { getRelativeDateText } from './date-utils'

const MAX_RESULTS = 6
const MAX_AGE_DAYS = 14

export interface MatchResult {
  id: string
  date: Date
  dateString: string
  time: string | null
  relativeDate: string | null
  groupName: string | null
  groupUrl: string | null
  reportUrl: string | null
  location: string | null
  homeTeam: string
  guestTeam: string
  isHome: boolean
  matchScore: { home: number; guest: number } | null
  setsScore: { home: number; guest: number } | null
  gamesScore: { home: number; guest: number } | null
  homeWins: boolean
  guestWins: boolean
  isWin: boolean
}

interface ParsedResult {
  matchScore: { home: number; guest: number }
  setsScore: { home: number; guest: number } | null
  gamesScore: { home: number; guest: number } | null
}

/**
 * Parse a nuliga-reader result string into match/sets/games scores.
 * Accepts "3:2" or the detailed "3:3 (6:7 / 49:59)" form.
 */
function parseResult(result: string | undefined): ParsedResult | null {
  if (!result) return null
  const parts = result.trim().match(/^(\d+):(\d+)(?:\s*\((\d+):(\d+)\s*\/\s*(\d+):(\d+)\))?$/)
  if (!parts) return null
  const matchScore = { home: parseInt(parts[1]!, 10), guest: parseInt(parts[2]!, 10) }
  const setsScore = parts[3] != null
    ? { home: parseInt(parts[3]!, 10), guest: parseInt(parts[4]!, 10) }
    : null
  const gamesScore = parts[5] != null
    ? { home: parseInt(parts[5]!, 10), guest: parseInt(parts[6]!, 10) }
    : null
  return { matchScore, setsScore, gamesScore }
}

/**
 * Compute match winner information from scores.
 */
function computeWinner(
  matchScore: { home: number; guest: number } | null,
  setsScore: { home: number; guest: number } | null,
  gamesScore: { home: number; guest: number } | null,
  isHome: boolean
): { homeWins: boolean; guestWins: boolean; isWin: boolean } {
  let homeWins = false
  let guestWins = false

  // Determine winner: matches > sets > games
  if (matchScore) {
    if (matchScore.home > matchScore.guest) {
      homeWins = true
    } else if (matchScore.home < matchScore.guest) {
      guestWins = true
    }
  }

  if (!homeWins && !guestWins && setsScore) {
    if (setsScore.home > setsScore.guest) {
      homeWins = true
    } else if (setsScore.home < setsScore.guest) {
      guestWins = true
    }
  }

  if (!homeWins && !guestWins && gamesScore) {
    if (gamesScore.home > gamesScore.guest) {
      homeWins = true
    } else if (gamesScore.home < gamesScore.guest) {
      guestWins = true
    }
  }

  // Determine if our side won
  const isWin = isHome ? homeWins : guestWins

  return { homeWins, guestWins, isWin }
}

export interface MatchResultsData {
  results: MatchResult[]
  hasResults: boolean
}

/**
 * Transform match events into match results for TV display.
 * Only includes recent completed matches.
 */
export function transformMatchResultsForTv(events: CalendarEvent[]): MatchResultsData {
  const today = new Date()
  const cutoffDate = new Date(today)
  cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS)

  // Filter to match events with results
  const matchEvents = events
    .filter((e) => e.source === 'match')
    .filter((e) => {
      const meta = e.metadata as MatchEventMetadata
      return meta.result && meta.result.trim() !== ''
    })
    .filter((e) => {
      // Only include matches in the past
      return e.startDate < today && e.startDate >= cutoffDate
    })
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
    .slice(0, MAX_RESULTS)

  const results: MatchResult[] = matchEvents.map((event) => {
    const meta = event.metadata as MatchEventMetadata
    const parsed = parseResult(meta.result)
    const matchScore = parsed?.matchScore ?? null
    const setsScore = parsed?.setsScore ?? null
    const gamesScore = parsed?.gamesScore ?? null

    const { homeWins, guestWins, isWin } = computeWinner(matchScore, setsScore, gamesScore, meta.isHome)

    const normalizedLocation =
      event.location?.toLowerCase() === 'tc waiblingen' ? 'Tennis-Club Waiblingen e.V.' : event.location

    return {
      id: event.id,
      date: event.startDate,
      dateString: event.startDate.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      time: event.startTime,
      relativeDate: getRelativeDateText(event.startDate, today),
      groupName: meta.group || null,
      groupUrl: meta.groupUrl || null,
      reportUrl: meta.reportUrl || null,
      location: normalizedLocation,
      homeTeam: meta.homeTeam,
      guestTeam: meta.awayTeam,
      isHome: meta.isHome,
      matchScore,
      setsScore,
      gamesScore,
      homeWins,
      guestWins,
      isWin,
    }
  })

  return {
    results,
    hasResults: results.length > 0,
  }
}
