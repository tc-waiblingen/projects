// Types
export type {
  CalendarEvent,
  CalendarEventSource,
  CalendarEventMetadata,
  AppEventMetadata,
  ClubEventMetadata,
  MatchEventMetadata,
  TournamentEventMetadata,
  TournamentCompetition,
  TournamentStage,
  FetchCalendarOptions,
  CalendarConfig,
  CalendarFetcherConfig,
  DirectusCalendarItem,
} from './types'

// Fetchers
export {
  fetchAllCalendarEvents,
  fetchAppCalendarEvents,
  fetchClubEvents,
  fetchMatches,
  fetchTournaments,
  fetchMatchResults,
  DIRECTUS_FILE_FIELDS,
  _testHelpers,
} from './fetchers'

// Nr-client (nuliga-reader)
export {
  fetchNrTeams,
  fetchNrMatches,
  fetchNrMatchChanges,
} from './nr-client'
export type {
  NrTeam,
  NrMatch,
  NrMatchChange,
  NrListMatchChangesResponse,
  FetchNrMatchChangesOptions,
} from './nr-client'

// Event predicates
export { isTournamentEvent } from './event-predicates'

// Active-days + date formatting
export { eventActiveDays, parsePlayDate } from './active-days'
export { formatTournamentPlayDates, buildTournamentDateRuns } from './format-dates'
export type { FormatPlayDatesOptions, DateRun } from './format-dates'

// Match-change summary
export { buildMatchChangeSummary } from './match-change-summary'
export type {
  MatchChangeKind,
  MatchChangeSummaryEntry,
  MatchChangeSummaryGroup,
  BuildMatchChangeSummaryOptions,
} from './match-change-summary'

// Grouping
export {
  groupEventsByMonth,
  sortDayEvents,
  addEventToDay,
  formatMonthHeader,
  isValidDate,
  getDateKey,
  getMonthKey,
} from './grouping'

export type { DayGroup, MonthGroup } from './grouping'

// Court usage
export {
  computeCourtUsage,
  getCourtCount,
  getPlayerCount,
  getSeasonCourtType,
  getMatchCourtType,
  getHeatLevel,
} from './court-usage'

export type {
  CourtUsageConfig,
  CourtUsageMonth,
  CourtUsageDay,
  CourtUsageHalf,
  CourtUsageEntry,
  TournamentUsageEntry,
} from './court-usage'
