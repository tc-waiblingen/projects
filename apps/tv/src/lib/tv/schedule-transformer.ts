/**
 * Schedule data transformation for TV display.
 * Groups events into day panels with prioritization.
 */

import type { CalendarEvent, AppEventMetadata, ClubEventMetadata, MatchEventMetadata, TournamentEventMetadata } from '@tcw/calendar'
import { eventActiveDays, formatTournamentPlayDates } from '@tcw/calendar'

const MAX_DAY_PANELS = 6
const MAX_WEIGHT_PER_DAY = 7

export interface TvEvent {
  id: string
  source: 'app' | 'club' | 'match' | 'tournament'
  title: string
  description: string | null
  location: string | null
  startDate: Date
  /** For display grouping (may differ from startDate for multi-day events) */
  displayDate: Date
  startTime: string | null
  endTime: string | null
  isAllDay: boolean
  isMultiDay: boolean
  /** Display weight: 1 = compact, 2 = medium, 3 = large */
  displayWeight: number
  important?: boolean
  categories?: string[]
  matchType?: string
  groupName?: string
  groupUrl?: string | null
  dateLabel?: string
  registrationUrl?: string | null
  callForEntriesUrl?: string | null
  tournamentUrl?: string | null
  imageUrl?: string | null
  website?: string | null
}

export interface DayPanel {
  dateKey: string
  date: Date
  events: TvEvent[]
  overflow: number
  hasImportant: boolean
}

/**
 * Normalize a CalendarEvent to TvEvent format.
 */
function normalizeEvent(event: ExpandedCalendarEvent): TvEvent | null {
  const displayDate = event.displayDate ?? event.startDate
  const base: TvEvent = {
    id: event.id,
    source: event.source,
    title: event.title,
    description: event.description,
    location: event.location,
    startDate: event.startDate,
    displayDate,
    startTime: event.startTime,
    endTime: event.endTime,
    isAllDay: event.isAllDay,
    isMultiDay: event.isMultiDay,
    displayWeight: event.displayWeight,
    imageUrl: event.imageUrl,
  }

  switch (event.source) {
    case 'club': {
      const meta = event.metadata as ClubEventMetadata
      return {
        ...base,
        important: meta.important,
        website: event.url,
      }
    }
    case 'app': {
      const meta = event.metadata as AppEventMetadata
      return {
        ...base,
        categories: meta.categories,
      }
    }
    case 'match': {
      const meta = event.metadata as MatchEventMetadata
      const normalizedLocation =
        event.location?.toLowerCase() === 'tc waiblingen' ? 'Tennis-Club Waiblingen e.V.' : event.location
      return {
        ...base,
        location: normalizedLocation,
        groupName: meta.leagueFull || meta.league,
        groupUrl: meta.leagueUrl,
        matchType: meta.isHome ? 'Heimspiel' : 'Auswärtsspiel',
      }
    }
    case 'tournament': {
      const meta = event.metadata as TournamentEventMetadata
      // Format date label for tournaments (use original start date for multi-day events)
      const labelStartDate = event.originalStartDate ?? event.startDate
      let dateLabel = ''
      const playDates = event.playDates
      if (playDates && playDates.length > 1) {
        dateLabel = formatTournamentPlayDates(playDates)
      } else if (event.isMultiDay && event.endDate) {
        const startStr = labelStartDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })
        const endStr = event.endDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' })
        dateLabel = `${startStr} – ${endStr}`
      } else {
        dateLabel = labelStartDate.toLocaleDateString('de-DE', {
          weekday: 'short',
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
        })
      }
      return {
        ...base,
        location: 'Tennis-Club Waiblingen e.V.',
        dateLabel,
        registrationUrl: meta.registrationUrl,
        callForEntriesUrl: meta.callForEntriesUrl,
        tournamentUrl: meta.tournamentUrl,
      }
    }
    default:
      return base
  }
}

/**
 * Determine if an event should be highlighted as important.
 */
function isImportantEvent(event: TvEvent, today: Date): boolean {
  // Club events marked as important
  if (event.source === 'club' && event.important) {
    return true
  }

  // App events in "Wichtig" category
  if (event.source === 'app') {
    const categories = (event.categories || [])
      .flatMap((category) => String(category || '').split(','))
      .map((category) => category.trim().toLowerCase())
      .filter(Boolean)
    const isWichtig = categories.includes('wichtig')
    if (!isWichtig) {
      return false
    }
    const cutoff = new Date(today.getFullYear(), today.getMonth() + 10, today.getDate())
    return event.startDate <= cutoff
  }

  return false
}

/**
 * Group events by date and apply display prioritization.
 */
function groupAndPrioritize(events: TvEvent[], maxPanels: number, maxWeight: number): DayPanel[] {
  const today = new Date()

  // Group by displayDate (using local date components to avoid UTC shift)
  const groupedByDate = new Map<string, TvEvent[]>()
  for (const event of events) {
    const year = event.displayDate.getFullYear()
    const month = String(event.displayDate.getMonth() + 1).padStart(2, '0')
    const day = String(event.displayDate.getDate()).padStart(2, '0')
    const dateKey = `${year}-${month}-${day}`
    if (!groupedByDate.has(dateKey)) {
      groupedByDate.set(dateKey, [])
    }
    groupedByDate.get(dateKey)!.push(event)
  }

  // Create day panels
  const allPanels = Array.from(groupedByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, dayEvents]) => {
      const dateParts = dateKey.split('-').map(Number)
      const dayDate = new Date(dateParts[0]!, dateParts[1]! - 1, dateParts[2]!)
      const sorted = dayEvents.slice().sort((a, b) => {
        // All-day events come first
        if (a.isAllDay !== b.isAllDay) {
          return a.isAllDay ? -1 : 1
        }
        // Then sort by start time
        if (a.startTime && b.startTime) {
          const comparison = a.startTime.localeCompare(b.startTime)
          if (comparison !== 0) return comparison
        }
        // Finally by title
        return a.title.localeCompare(b.title)
      })

      // Select events by weight instead of count
      const visibleEvents: TvEvent[] = []
      let currentWeight = 0
      for (const event of sorted) {
        if (currentWeight + event.displayWeight <= maxWeight) {
          visibleEvents.push(event)
          currentWeight += event.displayWeight
        } else {
          break
        }
      }

      const hasImportant = sorted.some((event) => isImportantEvent(event, today))

      return {
        dateKey,
        date: dayDate,
        events: visibleEvents,
        overflow: Math.max(dayEvents.length - visibleEvents.length, 0),
        hasImportant,
      }
    })

  // Apply prioritization: important > non-important
  const importantPanels = allPanels.filter((panel) => panel.hasImportant)
  const nonImportantPanels = allPanels.filter((panel) => !panel.hasImportant)

  const selectedPanels = [...importantPanels, ...nonImportantPanels].slice(0, maxPanels).map((panel) => panel.dateKey)

  return allPanels.filter((panel) => selectedPanels.includes(panel.dateKey)).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

export interface ScheduleData {
  dayPanels: DayPanel[]
  hasEvents: boolean
}

/** Extended CalendarEvent with display date for multi-day expansion */
interface ExpandedCalendarEvent extends CalendarEvent {
  /** The date this event should be displayed on (for multi-day events) */
  displayDate?: Date
  /** Original start date preserved for label formatting */
  originalStartDate?: Date
}

/**
 * Expand multi-day tournaments into separate events for each day they run.
 */
function expandMultiDayEvents(events: CalendarEvent[], todayStart: Date): ExpandedCalendarEvent[] {
  const expanded: ExpandedCalendarEvent[] = []

  for (const event of events) {
    // Only expand multi-day tournaments
    if (event.source === 'tournament' && event.isMultiDay) {
      const days = eventActiveDays(event)
      days.forEach((day, dayIndex) => {
        if (day >= todayStart) {
          expanded.push({
            ...event,
            id: `${event.id}-day-${dayIndex}`,
            displayDate: new Date(day.getFullYear(), day.getMonth(), day.getDate()),
            originalStartDate: event.startDate,
          })
        }
      })
    } else {
      expanded.push(event)
    }
  }

  return expanded
}

/**
 * Transform calendar events into day panels for TV display.
 */
export function transformScheduleForTv(events: CalendarEvent[]): ScheduleData {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // Expand multi-day tournaments to appear on each day
  const expandedEvents = expandMultiDayEvents(events, todayStart)

  // Normalize and filter to upcoming events
  const tvEvents = expandedEvents
    .map(normalizeEvent)
    .filter((e): e is TvEvent => e !== null)
    .filter((event) => event.displayDate >= todayStart)
    .sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime())

  // Group by date and prioritize
  const dayPanels = groupAndPrioritize(tvEvents, MAX_DAY_PANELS, MAX_WEIGHT_PER_DAY)

  return {
    dayPanels,
    hasEvents: dayPanels.length > 0,
  }
}

export { isImportantEvent }
