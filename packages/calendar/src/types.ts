export type CalendarEventSource = 'app' | 'club' | 'match' | 'tournament'

export interface AppEventMetadata {
  uid: string
  rrule?: string
  recurrenceId?: Date
  organizer?: string
  categories?: string[]
}

export interface ClubEventMetadata {
  important: boolean
  showOnTv: boolean
  category?: 'beginners' | 'children' | 'tournament' | null
}

export interface MatchEventMetadata {
  homeTeam: string
  homeTeamUrl?: string
  awayTeam: string
  awayTeamUrl?: string
  result?: string
  reportUrl?: string
  league?: string
  leagueFull?: string
  leagueUrl?: string
  district?: string
  season?: string
  isHome: boolean
  teamId?: string
  teamName?: string
  seasonSort?: number
  group?: string
  groupUrl?: string
}

export interface TournamentEventMetadata {
  category?: string
  registrationDeadline?: string
  entryFee?: string
  callForEntriesUrl?: string
  registrationUrl?: string
}

export type CalendarEventMetadata =
  | AppEventMetadata
  | ClubEventMetadata
  | MatchEventMetadata
  | TournamentEventMetadata
  | Record<string, never>

export interface CalendarEvent {
  id: string
  source: CalendarEventSource
  title: string
  description: string | null
  location: string | null
  startDate: Date
  endDate: Date | null
  startTime: string | null // HH:MM
  endTime: string | null // HH:MM
  isAllDay: boolean
  isMultiDay: boolean
  expandDays?: boolean
  url: string | null
  imageUrl: string | null
  metadata: CalendarEventMetadata
  displayWeight: number // 1 = compact (title only), 2 = medium, 3 = large (long description)
}

export interface FetchCalendarOptions {
  from?: Date
  to?: Date
}

export interface CalendarConfig {
  appCalendarUrl: string | null
}

/**
 * Configuration for calendar fetchers
 * Each app provides its own Directus client and utilities
 */
export interface CalendarFetcherConfig {
  /** Function to fetch calendar config from Directus */
  fetchCalendarConfig: () => Promise<CalendarConfig>
  /** Function to get asset URL for Directus files */
  getDirectusAssetURL: (file: { id: string } | string) => string
  /** Directus client for fetching club events */
  directus: {
    request: <T>(query: unknown) => Promise<T>
  }
  /** Directus readItems helper */
  readItems: (
    collection: string,
    query: {
      filter?: unknown
      sort?: string[]
      limit?: number
      fields?: unknown[]
    }
  ) => unknown
}

/** Directus Calendar item from the calendar collection */
export interface DirectusCalendarItem {
  id: string | number
  status?: string
  title?: string
  description?: string | null
  location?: string | null
  start_date: string
  end_date?: string | null
  website?: string | null
  important?: boolean
  show_on_tv?: boolean
  category?: 'beginners' | 'children' | 'tournament' | null
  logo?: { id: string } | string | null
  expand_days?: boolean
}
