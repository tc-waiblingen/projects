import type { CalendarEvent } from './types'

const MAX_RANGE_DAYS = 365

/**
 * Authoritative list of days an event occupies.
 *
 * - If `event.playDates` has entries, those are returned verbatim.
 * - Else, for multi-day events with an end date, every day from startDate to
 *   endDate (inclusive) is enumerated.
 * - Else, just [startDate].
 */
export function eventActiveDays(event: CalendarEvent): Date[] {
  if (event.playDates && event.playDates.length > 0) {
    return event.playDates.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()))
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
