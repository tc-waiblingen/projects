import { eventActiveDays } from './active-days'
import type { CalendarEvent, CalendarEventSource } from './types'

/**
 * Format a date as a month header string (e.g., "Januar 2025")
 */
export function formatMonthHeader(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
  })
}

/**
 * Check if a date is valid
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Get a unique key for a date (YYYY-MM-DD format)
 */
export function getDateKey(date: Date): string {
  // Use local date components to avoid timezone shift issues
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get a unique key for a month (YYYY-MM format)
 */
export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Priority order for event sources when sorting */
const SOURCE_PRIORITY: Record<CalendarEventSource, number> = {
  club: 0,
  app: 1,
  tournament: 2,
  match: 3,
}

/**
 * Sort events within a single day
 * - All-day events come first
 * - Then by start time
 * - Then by source priority
 */
export function sortDayEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    // All-day events come first
    if (a.isAllDay !== b.isAllDay) {
      return a.isAllDay ? -1 : 1
    }

    // Sort by start time (null/no time comes first for timed events)
    const timeA = a.startTime ?? ''
    const timeB = b.startTime ?? ''
    if (timeA !== timeB) {
      return timeA.localeCompare(timeB)
    }

    // Same start time: sort by source priority
    const priorityA = SOURCE_PRIORITY[a.source] ?? 99
    const priorityB = SOURCE_PRIORITY[b.source] ?? 99
    return priorityA - priorityB
  })
}

export interface DayGroup {
  dateKey: string
  date: Date
  events: CalendarEvent[]
}

export interface MonthGroup {
  monthKey: string
  monthDate: Date
  days: DayGroup[]
}

/**
 * Add an event to a specific day in the months map
 */
export function addEventToDay(
  monthsMap: Map<string, { monthDate: Date; daysMap: Map<string, DayGroup> }>,
  event: CalendarEvent,
  date: Date
): void {
  const monthKey = getMonthKey(date)
  const dateKey = getDateKey(date)

  let monthGroup = monthsMap.get(monthKey)
  if (!monthGroup) {
    monthGroup = {
      monthDate: new Date(date.getFullYear(), date.getMonth(), 1),
      daysMap: new Map(),
    }
    monthsMap.set(monthKey, monthGroup)
  }

  let dayGroup = monthGroup.daysMap.get(dateKey)
  if (!dayGroup) {
    dayGroup = {
      dateKey,
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      events: [],
    }
    monthGroup.daysMap.set(dateKey, dayGroup)
  }

  dayGroup.events.push(event)
}

/**
 * Group calendar events by month, expanding multi-day events.
 *
 * Each event's active days come from `eventActiveDays` — which honors
 * `event.playDates` when present (e.g. STS tournaments with non-contiguous
 * play dates) and otherwise enumerates `[startDate, endDate]`. An event with
 * `expandDays === false` is pinned to its `startDate` regardless.
 */
export function groupEventsByMonth(events: CalendarEvent[]): MonthGroup[] {
  const monthsMap = new Map<string, { monthDate: Date; daysMap: Map<string, DayGroup> }>()

  for (const event of events) {
    if (!isValidDate(event.startDate)) {
      continue
    }

    if (event.expandDays === false) {
      addEventToDay(monthsMap, event, event.startDate)
      continue
    }

    for (const day of eventActiveDays(event)) {
      addEventToDay(monthsMap, event, day)
    }
  }

  return Array.from(monthsMap.entries()).map(([monthKey, { monthDate, daysMap }]) => ({
    monthKey,
    monthDate,
    days: Array.from(daysMap.values()),
  }))
}
