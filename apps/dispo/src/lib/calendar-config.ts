import type { CalendarFetcherConfig } from '@tcw/calendar'
import { getDirectus } from './directus/client'

export function getCalendarConfig(): CalendarFetcherConfig {
  const { directus, readItems } = getDirectus()
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? ''
  return {
    fetchCalendarConfig: async () => ({ appCalendarUrl: null }),
    getDirectusAssetURL: (file) => {
      const id = typeof file === 'string' ? file : file.id
      return `${directusUrl}/assets/${id}`
    },
    directus: directus as unknown as CalendarFetcherConfig['directus'],
    readItems: readItems as unknown as CalendarFetcherConfig['readItems'],
  }
}
