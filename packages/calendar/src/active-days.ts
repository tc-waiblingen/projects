import type { CalendarEvent } from './types'

const MAX_RANGE_DAYS = 365

/**
 * Parse a `YYYY-MM-DD` ISO date string (as returned by nuliga-reader) into a
 * local-time Date at midnight. Returns `null` for malformed input.
 */
export function parsePlayDate(iso: string): Date | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/**
 * Authoritative list of days an event occupies.
 *
 * - If `event.playDates` has entries, those are parsed and returned.
 * - Else, for multi-day events with an end date, every day from startDate to
 *   endDate (inclusive) is enumerated.
 * - Else, just [startDate].
 */
export function eventActiveDays(event: CalendarEvent): Date[] {
  if (event.playDates && event.playDates.length > 0) {
    const parsed: Date[] = []
    for (const iso of event.playDates) {
      const d = parsePlayDate(iso)
      if (d) parsed.push(d)
    }
    if (parsed.length > 0) return parsed
  }

  if (event.isMultiDay && event.endDate) {
    const days: Date[] = []
    const current = new Date(
      event.startDate.getFullYear(),
      event.startDate.getMonth(),
      event.startDate.getDate(),
    )
    const endTime = new Date(
      event.endDate.getFullYear(),
      event.endDate.getMonth(),
      event.endDate.getDate(),
    ).getTime()
    let iterations = 0
    while (current.getTime() <= endTime && iterations < MAX_RANGE_DAYS) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
      iterations++
    }
    return days
  }

  return [
    new Date(
      event.startDate.getFullYear(),
      event.startDate.getMonth(),
      event.startDate.getDate(),
    ),
  ]
}
