/**
 * Data fetchers for TV display screens.
 */

import { cache } from 'react'
import {
  computeCourtStatus,
  formatEbusyDate,
  listCourtModuleReservations,
  listLiteModuleReservations,
  listModules,
  type EbusyReservation,
} from '@tcw/ebusy'
import { getDirectus } from '@/lib/directus/directus'
import type { Court, DirectusFile, Global, OfficeHour, Sponsor, Team, Trainer } from '@/types/directus-schema'
import { fetchAllCalendarEvents } from '@/lib/directus/calendar-fetchers'
import { fetchInstagramFeed } from '@/lib/instagram/fetchers'
import { transformScheduleForTv, type ScheduleData } from './schedule-transformer'
import { transformMatchResultsForTv, type MatchResultsData } from './match-results-transformer'

const COURT_STATUS_REVALIDATE_SECONDS = 300

/** Common DirectusFile fields needed for image display */
const DIRECTUS_FILE_FIELDS = ['id', 'filename_disk', 'filename_download', 'title', 'description', 'type', 'width', 'height'] as const

/** Maximum age in days for Instagram posts/stories to be shown */
const MAX_INSTAGRAM_AGE_DAYS = 14

/** Convert an Instagram CDN URL to a proxied URL */
function getInstagramProxyUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  return `/api/instagram/media?url=${encodeURIComponent(url)}`
}

export interface OfficeData {
  hours: OfficeHour[]
  closingDays: string[]
  showBadge: boolean
  badgeType: 'open' | 'closed'
  announcement: { message: string } | null
}

export interface SponsorsData {
  byCategory: Record<string, Sponsor[]>
}

export interface CourtStatus {
  directusId: number
  name: string
  ebusyId: string
  busy: boolean
  currentEndsAt?: string
}

export interface CourtStatusData {
  areaMapId: string | null
  courts: CourtStatus[]
}

export interface InstagramFeedData {
  configured: boolean
  error?: string
  profileUrl: string | null
  feed: Array<{
    id: string
    type: 'post' | 'story'
    media_type: string
    media_url: string
    thumbnail_url?: string
    caption?: string
    permalink: string
    timestamp: string
  }>
}

/**
 * Fetch global site settings.
 */
export const fetchGlobals = cache(async (): Promise<Global> => {
  const { directus, readSingleton } = getDirectus()

  const globals = await directus.request(
    readSingleton('global', {
      fields: ['*'],
    })
  )

  return globals as Global
})

/**
 * Fetch office hours and closing days for TV display.
 */
export const fetchOfficeData = cache(async (): Promise<OfficeData> => {
  const { directus, readItems, readSingleton } = getDirectus()
  const today = new Date().toISOString().split('T')[0]!

  const [hours, closingDays, announcementData] = await Promise.all([
    directus.request(
      readItems('office_hours', {
        sort: ['sort', 'starts_at'],
        fields: ['id', 'day', 'starts_at', 'ends_at'],
      })
    ),
    directus.request(
      readItems('office_closing_days', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filter: { date: { _gte: today } } as any,
        sort: ['date'],
        fields: ['date'],
        limit: 5,
      })
    ),
    directus.request(
      readSingleton('office_announcement', {
        fields: ['status', 'message', 'from', 'until'],
      })
    ),
  ])

  const closingDayDates = closingDays as Array<{ date: string }>

  // Format closing days
  const formattedClosingDays = closingDayDates.map((day) => {
    const date = new Date(day.date + 'T00:00:00')
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  })

  // Check if today is a closing day
  const todayClosingDay = (closingDays as Array<{ date: string }>).find((day) => day.date === today)

  // Check if office is normally open today
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const todayDayName = dayNames[new Date().getDay()]
  const todayHours = (hours as OfficeHour[]).find((h) => h.day === todayDayName)
  const isNormallyOpenToday = !!todayHours

  // Determine badge state
  const showBadge = isNormallyOpenToday
  const badgeType: 'open' | 'closed' = todayClosingDay ? 'closed' : 'open'

  // Get announcement (check if published and within date range)
  const announcementRecord = announcementData as {
    status?: 'published' | 'draft' | 'archived'
    message?: string | null
    from?: string | null
    until?: string | null
  }

  let announcement: { message: string } | null = null
  if (announcementRecord.status === 'published' && announcementRecord.message) {
    const isAfterFrom = !announcementRecord.from || today >= announcementRecord.from
    const isBeforeUntil = !announcementRecord.until || today <= announcementRecord.until
    if (isAfterFrom && isBeforeUntil) {
      announcement = { message: announcementRecord.message }
    }
  }

  return {
    hours: hours as OfficeHour[],
    closingDays: formattedClosingDays,
    showBadge,
    badgeType,
    announcement,
  }
})

/**
 * Fetch sponsors grouped by category.
 */
export const fetchSponsors = cache(async (): Promise<SponsorsData> => {
  const { directus, readItems } = getDirectus()

  const sponsors = await directus.request(
    readItems('sponsors', {
      filter: { status: { _eq: 'active' } },
      sort: ['category', 'sort'],
      fields: [
        'id',
        'name',
        'category',
        'website',
        { logo_web: [...DIRECTUS_FILE_FIELDS] },
      ],
    })
  )

  // Group by category
  const byCategory: Record<string, Sponsor[]> = {}
  for (const sponsor of sponsors as unknown as Sponsor[]) {
    const category = sponsor.category || 'other'
    if (!byCategory[category]) {
      byCategory[category] = []
    }
    byCategory[category].push(sponsor)
  }

  return { byCategory }
})

/**
 * Fetch team members for TV display.
 */
export const fetchTeamMembers = cache(async (): Promise<Team[]> => {
  const { directus, readItems } = getDirectus()

  const team = await directus.request(
    readItems('team', {
      filter: { status: { _eq: 'published' } },
      sort: ['sort'],
      fields: ['id', 'name', 'function', { picture: [...DIRECTUS_FILE_FIELDS] }],
    })
  )

  return team as unknown as Team[]
})

/**
 * Fetch trainers for TV display.
 */
export const fetchTrainers = cache(async (): Promise<Trainer[]> => {
  const { directus, readItems } = getDirectus()

  const trainers = await directus.request(
    readItems('trainers', {
      filter: { status: { _eq: 'published' } },
      sort: ['sort'],
      fields: ['id', 'name', 'phone', 'email', 'website', { banner: [...DIRECTUS_FILE_FIELDS] }],
    })
  )

  return trainers as unknown as Trainer[]
})

/**
 * Fetch schedule data for TV display.
 */
export const fetchScheduleData = cache(async (): Promise<ScheduleData> => {
  const now = new Date()
  const threeMonthsLater = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())

  const events = await fetchAllCalendarEvents({
    from: now,
    to: threeMonthsLater,
  })

  return transformScheduleForTv(events)
})

/**
 * Fetch match results for TV display.
 */
export const fetchMatchResultsData = cache(async (): Promise<MatchResultsData> => {
  const now = new Date()
  const twoMonthsAgo = new Date(now)
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

  const events = await fetchAllCalendarEvents({
    from: twoMonthsAgo,
    to: now,
  })

  return transformMatchResultsForTv(events)
})

/**
 * Fetch Instagram feed for TV display.
 */
export const fetchInstagramFeedData = cache(async (): Promise<InstagramFeedData> => {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
  const userId = process.env.INSTAGRAM_USER_ID

  if (!accessToken || !userId) {
    return {
      configured: false,
      profileUrl: null,
      feed: [],
    }
  }

  try {
    const feed = await fetchInstagramFeed({ limit: 20, showPosts: true, showStories: true })

    // Filter by age - only show posts/stories from the last 14 days
    const now = new Date()
    const maxAgeMs = MAX_INSTAGRAM_AGE_DAYS * 24 * 60 * 60 * 1000

    const filteredFeed = feed
      .map((item) => ({
        id: item.data.id,
        type: item.type,
        media_type: item.data.media_type,
        media_url: getInstagramProxyUrl(item.data.media_url)!,
        thumbnail_url: getInstagramProxyUrl(item.data.thumbnail_url),
        caption: 'caption' in item.data ? item.data.caption : undefined,
        permalink: item.data.permalink,
        timestamp: item.data.timestamp,
      }))
      .filter((item) => {
        const itemDate = new Date(item.timestamp)
        return now.getTime() - itemDate.getTime() <= maxAgeMs
      })

    return {
      configured: true,
      profileUrl: `https://instagram.com/${process.env.INSTAGRAM_USERNAME || 'tcwaiblingen'}`,
      feed: filteredFeed,
    }
  } catch (error) {
    console.error('Error fetching Instagram feed:', error)
    return {
      configured: true,
      error: (error as Error).message,
      profileUrl: null,
      feed: [],
    }
  }
})

/**
 * Fetch live court busy/free status for the TV display.
 *
 * Queries the eBuSy API for today's reservations across every Hallenmodul
 * (COURT) and Freiplatzmodul (LITE), then joins them to Directus courts by
 * `ebusy_id`. Also returns the site-plan SVG file id from the global singleton.
 *
 * If the eBuSy API is unavailable we still return the area map and the list
 * of courts (all marked free) so the screen renders in a neutral state.
 */
export const fetchCourtStatusData = cache(async (): Promise<CourtStatusData> => {
  const { directus, readSingleton, readItems } = getDirectus()

  const [globalData, courtItems] = await Promise.all([
    directus.request(readSingleton('global', { fields: ['area_map'] })),
    directus.request(
      readItems('courts', {
        filter: { status: { _eq: 'published' } },
        fields: ['id', 'name', 'ebusy_id'],
        sort: ['sort'],
        limit: -1,
      }),
    ),
  ])

  const areaMapField = (globalData as Partial<Global>).area_map as DirectusFile | string | null | undefined
  const areaMapId = typeof areaMapField === 'string' ? areaMapField : (areaMapField?.id ?? null)

  const courts = (courtItems as Court[]).filter(
    (c): c is Court & { name: string; ebusy_id: string } =>
      typeof c.name === 'string' && typeof c.ebusy_id === 'string' && c.ebusy_id.length > 0,
  )

  const now = new Date()
  const today = formatEbusyDate(now)
  let reservationsByEbusyId = new Map<string, EbusyReservation[]>()

  try {
    const modules = await listModules(COURT_STATUS_REVALIDATE_SECONDS)
    const relevant = modules.filter((m) => m.type === 'COURT' || m.type === 'LITE')

    const reservationsPerModule = await Promise.all(
      relevant.map(async (mod) => {
        const fetcher = mod.type === 'COURT' ? listCourtModuleReservations : listLiteModuleReservations
        return fetcher(mod.id, { fromDate: today, toDate: today }, COURT_STATUS_REVALIDATE_SECONDS)
      }),
    )

    for (const list of reservationsPerModule) {
      for (const res of list) {
        const key = String(res.courtId)
        const existing = reservationsByEbusyId.get(key) ?? []
        existing.push(res)
        reservationsByEbusyId.set(key, existing)
      }
    }
  } catch (error) {
    console.error('fetchCourtStatusData: eBuSy fetch failed:', error)
    reservationsByEbusyId = new Map()
  }

  const statuses: CourtStatus[] = courts.map((court) => {
    const reservations = reservationsByEbusyId.get(court.ebusy_id) ?? []
    const status = computeCourtStatus(reservations, now)
    return {
      directusId: court.id,
      name: court.name,
      ebusyId: court.ebusy_id,
      busy: status.busy,
      currentEndsAt: status.currentEndsAt,
    }
  })

  return { areaMapId, courts: statuses }
})
