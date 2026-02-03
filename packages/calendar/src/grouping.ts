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

export interface GroupEventsByMonthOptions {
  /**
   * Filter function for multi-day event expansion.
   * Called for each day a multi-day event spans.
   * Return true to include the event on that day, false to skip.
   * Default: includes all days.
   */
  multiDayFilter?: (event: CalendarEvent, date: Date) => boolean
}

/**
 * Default filter for multi-day events: STS tournaments only on weekends
 */
export function defaultMultiDayFilter(event: CalendarEvent, date: Date): boolean {
  const isSts = event.title.includes('STS')
  if (!isSts) return true

  const dayOfWeek = date.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday
  return isWeekend
}

/**
 * Group calendar events by month, expanding multi-day events
 */
export function groupEventsByMonth(
  events: CalendarEvent[],
  options: GroupEventsByMonthOptions = {}
): MonthGroup[] {
  const { multiDayFilter = defaultMultiDayFilter } = options
  const monthsMap = new Map<string, { monthDate: Date; daysMap: Map<string, DayGroup> }>()

  for (const event of events) {
    if (!isValidDate(event.startDate)) {
      continue
    }

    // For multi-day events, add to each day they span
    if (event.isMultiDay && event.endDate && isValidDate(event.endDate)) {
      const currentDate = new Date(event.startDate)
      const endTime = event.endDate.getTime()

      // Safety limit to prevent infinite loops (max 365 days)
      let iterations = 0
      const maxIterations = 365

      while (currentDate.getTime() <= endTime && iterations < maxIterations) {
        // Apply filter (e.g., STS tournaments only on weekends)
        if (multiDayFilter(event, currentDate)) {
          addEventToDay(monthsMap, event, currentDate)
        }

        currentDate.setDate(currentDate.getDate() + 1)
        iterations++
      }
    } else {
      // Single-day event: add only to start date
      addEventToDay(monthsMap, event, event.startDate)
    }
  }

  return Array.from(monthsMap.entries()).map(([monthKey, { monthDate, daysMap }]) => ({
    monthKey,
    monthDate,
    days: Array.from(daysMap.values()),
  }))
}
