/**
 * Calendar fetchers configured for the website app
 *
 * This module re-exports calendar functions from @tcw/calendar
 * with the app-specific Directus configuration pre-applied.
 */
import {
  fetchAllCalendarEvents as baseFetchAllCalendarEvents,
  fetchAppCalendarEvents as baseFetchAppCalendarEvents,
  fetchClubEvents as baseFetchClubEvents,
  fetchMatches as baseFetchMatches,
  fetchTournaments as baseFetchTournaments,
  fetchMatchResults as baseFetchMatchResults,
  type CalendarFetcherConfig,
  type FetchCalendarOptions,
  type CalendarConfig,
} from '@tcw/calendar'
import { getDirectus } from './directus'
import { getDirectusAssetURL } from './directus-utils'
import type { Global } from '@/types/directus-schema'

/**
 * Fetches calendar URLs from Directus global settings
 */
export async function fetchCalendarConfig(): Promise<CalendarConfig> {
  const { directus, readSingleton } = getDirectus()

  try {
    const global = (await directus.request(
      readSingleton('global', {
        fields: ['app_calendar_url', 'nuliga_matches_url', 'wtb_tournaments_url'],
      })
    )) as Global

    return {
      appCalendarUrl: global.app_calendar_url ?? null,
      nuligaMatchesUrl: global.nuliga_matches_url ?? null,
      wtbTournamentsUrl: global.wtb_tournaments_url ?? null,
    }
  } catch (error) {
    console.error('Error fetching calendar config:', error)
    return {
      appCalendarUrl: null,
      nuligaMatchesUrl: null,
      wtbTournamentsUrl: null,
    }
  }
}

/**
 * Get the calendar fetcher configuration for this app
 */
function getCalendarConfig(): CalendarFetcherConfig {
  const { directus, readItems } = getDirectus()

  return {
    fetchCalendarConfig,
    getDirectusAssetURL: (file) => {
      if (typeof file === 'string') return getDirectusAssetURL(file)
      return getDirectusAssetURL(file)
    },
    directus: {
      request: <T>(query: unknown) => directus.request(query as Parameters<typeof directus.request>[0]) as Promise<T>,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readItems: (collection, query) => (readItems as any)(collection, query),
  }
}

// Re-export configured fetchers
export async function fetchAllCalendarEvents(options: FetchCalendarOptions = {}) {
  return baseFetchAllCalendarEvents(getCalendarConfig(), options)
}

export async function fetchAppCalendarEvents(options: FetchCalendarOptions = {}) {
  return baseFetchAppCalendarEvents(getCalendarConfig(), options)
}

export async function fetchClubEvents(options: FetchCalendarOptions = {}) {
  return baseFetchClubEvents(getCalendarConfig(), options)
}

export async function fetchMatches(options: FetchCalendarOptions = {}) {
  return baseFetchMatches(getCalendarConfig(), options)
}

export async function fetchTournaments(options: FetchCalendarOptions = {}) {
  return baseFetchTournaments(getCalendarConfig(), options)
}

export async function fetchMatchResults(months: number = 2, limit: number = 12) {
  return baseFetchMatchResults(getCalendarConfig(), months, limit)
}
