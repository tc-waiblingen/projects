import { parse as parseHTML } from 'node-html-parser'
import IcalExpander from 'ical-expander'
import type {
  CalendarEvent,
  CalendarEventSource,
  FetchCalendarOptions,
  AppEventMetadata,
  ClubEventMetadata,
  MatchEventMetadata,
  TournamentEventMetadata,
  CalendarFetcherConfig,
  DirectusCalendarItem,
} from './types'

/** Threshold for short vs long description (characters) */
const SHORT_DESCRIPTION_THRESHOLD = 100

/**
 * Calculate display weight based on event source and description length.
 * Weight determines how much space an event takes in the TV display:
 * - 1 = compact (title only)
 * - 2 = medium (title + short description or match/tournament)
 * - 3 = large (title + long description)
 */
function calculateDisplayWeight(source: CalendarEventSource, description: string | null): number {
  if (source === 'match' || source === 'tournament') {
    return 2
  }
  // Club and App events
  if (!description || description.trim() === '') {
    return 1
  }
  const length = description.trim().length
  return length <= SHORT_DESCRIPTION_THRESHOLD ? 2 : 3
}

/** Common DirectusFile fields needed for image display */
export const DIRECTUS_FILE_FIELDS = [
  'id',
  'filename_disk',
  'filename_download',
  'title',
  'description',
  'type',
  'width',
  'height',
] as const

/**
 * Helper to format time from Date as HH:MM
 */
function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5)
}

/**
 * Decode HTML entities and strip HTML tags from text
 */
function decodeHtmlText(text: string): string {
  // Common HTML entities
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
    '&hellip;': '…',
    '&euro;': '€',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
  }

  let result = text

  // Decode numeric entities (&#123; or &#x1F;)
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
  result = result.replace(/&#x([0-9A-Fa-f]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))

  // Decode named entities
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replaceAll(entity, char)
  }

  // Convert <br> and <br/> to newlines
  result = result.replace(/<br\s*\/?>/gi, '\n')

  // Convert </p> and </div> to newlines (block elements)
  result = result.replace(/<\/(p|div)>/gi, '\n')

  // Strip remaining HTML tags
  result = result.replace(/<[^>]+>/g, '')

  // Normalize whitespace (collapse multiple spaces/newlines)
  result = result.replace(/[ \t]+/g, ' ')
  result = result.replace(/\n\s*\n/g, '\n')
  result = result.trim()

  return result
}

/**
 * Helper to parse datetime string from Directus (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
 * Returns the date and optional time component
 */
function parseDirectusDateTime(dateStr: string): { date: Date; time: string | null } {
  const [datePart, timePart] = dateStr.split('T')
  if (!datePart) {
    return { date: new Date(), time: null }
  }
  const parts = datePart.split('-').map(Number)
  const year = parts[0] ?? 0
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  const date = new Date(year, month - 1, day)

  // Extract time if present (format: HH:MM:SS or HH:MM)
  let time: string | null = null
  if (timePart) {
    const timeMatch = /^(\d{2}):(\d{2})/.exec(timePart)
    const hours = timeMatch?.[1]
    const minutes = timeMatch?.[2]
    if (hours && minutes) {
      time = `${hours}:${minutes}`
    }
  }

  return { date, time }
}

/**
 * Parse iCal text to extract ATTACH URLs by UID
 * Returns a map of UID -> attachment URL
 */
function parseIcalAttachments(icsData: string): Map<string, string> {
  const attachments = new Map<string, string>()

  // Split into events
  const eventBlocks = icsData.split('BEGIN:VEVENT')

  for (const block of eventBlocks) {
    if (!block.includes('END:VEVENT')) continue

    // Extract UID
    const uidMatch = /^UID:(.+)$/m.exec(block)
    const uidValue = uidMatch?.[1]
    if (!uidValue) continue
    const uid = uidValue.trim()

    // Extract ATTACH or IMAGE URL (could be on multiple lines with line folding)
    // Handle line folding by joining lines that start with space
    const unfoldedBlock = block.replace(/\r?\n[ \t]/g, '')

    // Look for ATTACH property with http URL
    const attachMatch = /^ATTACH[^:]*:(.+)$/m.exec(unfoldedBlock)
    const attachValue = attachMatch?.[1]
    if (attachValue) {
      const url = attachValue.trim()
      if (url.startsWith('http')) {
        attachments.set(uid, url)
        continue
      }
    }

    // Also look for IMAGE property (used by some calendars)
    const imageMatch = /^IMAGE[^:]*:(.+)$/m.exec(unfoldedBlock)
    const imageValue = imageMatch?.[1]
    if (imageValue) {
      const url = imageValue.trim()
      if (url.startsWith('http')) {
        attachments.set(uid, url)
      }
    }
  }

  return attachments
}

/**
 * Fetches and parses iCal feed from the app calendar URL
 */
export async function fetchAppCalendarEvents(
  config: CalendarFetcherConfig,
  options: FetchCalendarOptions = {}
): Promise<CalendarEvent[]> {
  console.log('[fetchAppCalendarEvents] Function called')
  const calendarConfig = await config.fetchCalendarConfig()
  console.log('[fetchAppCalendarEvents] Calendar config:', calendarConfig.appCalendarUrl ? 'URL configured' : 'NO URL')

  if (!calendarConfig.appCalendarUrl) {
    console.warn('App calendar URL not configured')
    return []
  }

  try {
    const response = await fetch(calendarConfig.appCalendarUrl, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    } as RequestInit)

    if (!response.ok) {
      throw new Error(`Failed to fetch iCal: ${response.status}`)
    }

    const icsData = await response.text()
    console.log('[fetchAppCalendarEvents] Fetched iCal data, length:', icsData.length)

    // Parse attachments from raw iCal data
    const attachmentsMap = parseIcalAttachments(icsData)

    // Use ical-expander for date filtering and recurring events
    const expander = new IcalExpander({ ics: icsData, maxIterations: 1000 })

    const from = options.from ?? new Date()
    const to = options.to ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year ahead

    const { events, occurrences } = expander.between(from, to)
    console.log('[fetchAppCalendarEvents] Date range:', from.toISOString(), 'to', to.toISOString())
    console.log('[fetchAppCalendarEvents] Found events:', events.length, 'occurrences:', occurrences.length)

    const calendarEvents: CalendarEvent[] = []

    // Process single events
    for (const event of events) {
      const startDate = event.startDate.toJSDate()
      let endDate = event.endDate?.toJSDate() ?? null
      const isAllDay = event.startDate.isDate

      // iCal DTEND is exclusive for all-day events, so subtract one day for display
      if (isAllDay && endDate) {
        endDate = new Date(endDate)
        endDate.setDate(endDate.getDate() - 1)
      }

      const metadata: AppEventMetadata = {
        uid: event.uid,
        organizer: event.organizer || undefined,
      }

      // Extract RRULE if present
      const rruleProp = event.component.getFirstProperty('rrule')
      if (rruleProp) {
        metadata.rrule = String(rruleProp.getFirstValue())
      }

      // Extract categories
      const categories = event.component.getAllProperties('categories')
      if (categories.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata.categories = categories.flatMap((cat: any) => (cat.getValues() as string[]).map(String))
      }

      // Get image URL from attachments map
      const imageUrl = attachmentsMap.get(event.uid) || null

      // Extract URL property if present
      const urlProp = event.component.getFirstPropertyValue('url')
      const eventUrl = urlProp ? String(urlProp) : null

      // Check if event spans multiple days
      const isMultiDay = !!(
        endDate &&
        (startDate.getFullYear() !== endDate.getFullYear() ||
          startDate.getMonth() !== endDate.getMonth() ||
          startDate.getDate() !== endDate.getDate())
      )

      const description = event.description ? decodeHtmlText(event.description) : null
      calendarEvents.push({
        id: `app-${event.uid}`,
        source: 'app',
        title: event.summary || 'Untitled Event',
        description,
        location: event.location || null,
        startDate,
        endDate,
        startTime: isAllDay ? null : formatTime(startDate),
        endTime: isAllDay || !endDate ? null : formatTime(endDate),
        isAllDay,
        isMultiDay,
        url: eventUrl,
        imageUrl,
        metadata,
        displayWeight: calculateDisplayWeight('app', description),
      })
    }

    // Process recurring event occurrences
    for (const occurrence of occurrences) {
      const startDate = occurrence.startDate.toJSDate()
      let endDate = occurrence.endDate?.toJSDate() ?? null
      const isAllDay = occurrence.startDate.isDate
      const event = occurrence.item

      // iCal DTEND is exclusive for all-day events, so subtract one day for display
      if (isAllDay && endDate) {
        endDate = new Date(endDate)
        endDate.setDate(endDate.getDate() - 1)
      }

      const metadata: AppEventMetadata = {
        uid: event.uid,
        recurrenceId: occurrence.recurrenceId?.toJSDate(),
        organizer: event.organizer || undefined,
      }

      // Extract categories
      const categories = event.component.getAllProperties('categories')
      if (categories.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata.categories = categories.flatMap((cat: any) => (cat.getValues() as string[]).map(String))
      }

      // Get image URL from attachments map
      const imageUrl = attachmentsMap.get(event.uid) || null

      // Extract URL property if present
      const urlProp = event.component.getFirstPropertyValue('url')
      const eventUrl = urlProp ? String(urlProp) : null

      // Check if event spans multiple days
      const isMultiDay = !!(
        endDate &&
        (startDate.getFullYear() !== endDate.getFullYear() ||
          startDate.getMonth() !== endDate.getMonth() ||
          startDate.getDate() !== endDate.getDate())
      )

      const description = event.description ? decodeHtmlText(event.description) : null
      calendarEvents.push({
        id: `app-${event.uid}-${occurrence.recurrenceId?.toString() ?? startDate.toISOString()}`,
        source: 'app',
        title: event.summary || 'Untitled Event',
        description,
        location: event.location || null,
        startDate,
        endDate,
        startTime: isAllDay ? null : formatTime(startDate),
        endTime: isAllDay || !endDate ? null : formatTime(endDate),
        isAllDay,
        isMultiDay,
        url: eventUrl,
        imageUrl,
        metadata,
        displayWeight: calculateDisplayWeight('app', description),
      })
    }

    // Filter out events with "Tischreservierung" category
    const filteredEvents = calendarEvents.filter((event) => {
      const categories = (event.metadata as AppEventMetadata).categories || []
      const normalizedCategories = categories
        .flatMap((cat) => String(cat || '').split(','))
        .map((cat) => cat.trim().toLowerCase())
      return !normalizedCategories.includes('tischreservierung')
    })

    console.log('[fetchAppCalendarEvents] Returning', filteredEvents.length, 'events (filtered from', calendarEvents.length, ')')
    if (filteredEvents.length > 0) {
      console.log('[fetchAppCalendarEvents] Sample event:', filteredEvents[0]?.title, filteredEvents[0]?.metadata)
    }
    return filteredEvents
  } catch (error) {
    console.error('Error fetching app calendar events:', error)
    return []
  }
}

/**
 * Fetches club events from Directus calendar collection
 */
export async function fetchClubEvents(
  config: CalendarFetcherConfig,
  options: FetchCalendarOptions = {}
): Promise<CalendarEvent[]> {
  try {
    const from = options.from ?? new Date()
    const to = options.to

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Directus SDK doesn't type _gte/_lte operators on date fields
    const filter: any = {
      status: { _eq: 'published' },
      start_date: { _gte: from.toISOString().split('T')[0] },
    }

    if (to) {
      filter.start_date._lte = to.toISOString().split('T')[0]
    } else {
      // Default upper bound: at least 12 months out, or end of next year (whichever is later)
      const twelveMonthsOut = new Date(from)
      twelveMonthsOut.setFullYear(twelveMonthsOut.getFullYear() + 1)
      const endOfNextYear = new Date(from.getFullYear() + 1, 11, 31)
      const defaultTo = twelveMonthsOut > endOfNextYear ? twelveMonthsOut : endOfNextYear
      filter.start_date._lte = defaultTo.toISOString().split('T')[0]
    }

    const events = (await config.directus.request(
      config.readItems('calendar', {
        filter,
        sort: ['start_date'],
        limit: -1,
        fields: ['*', { logo: [...DIRECTUS_FILE_FIELDS] }],
      })
    )) as unknown as DirectusCalendarItem[]

    // Helper to check if two dates are on different days
    const isDifferentDay = (d1: Date, d2: Date) =>
      d1.getFullYear() !== d2.getFullYear() || d1.getMonth() !== d2.getMonth() || d1.getDate() !== d2.getDate()

    return events.map((event): CalendarEvent => {
      const start = parseDirectusDateTime(event.start_date)
      const end = event.end_date ? parseDirectusDateTime(event.end_date) : null

      // Event is all-day if no time component is present OR if it spans multiple days
      const isMultiDay = !!(end?.date && isDifferentDay(start.date, end.date))
      const isAllDay = !start.time || isMultiDay

      const metadata: ClubEventMetadata = {
        important: event.important ?? false,
        showOnTv: event.show_on_tv ?? false,
        category: event.category ?? null,
      }

      const description = event.description || null

      return {
        id: `club-${event.id}`,
        source: 'club',
        title: event.title || 'Untitled Event',
        description,
        location: event.location || null,
        startDate: start.date,
        endDate: end?.date ?? null,
        // Clear time fields for multi-day events since they should be treated as all-day
        startTime: isMultiDay ? null : start.time,
        endTime: isMultiDay ? null : (end?.time ?? null),
        isAllDay,
        isMultiDay,
        url: event.website || null,
        imageUrl: event.logo ? config.getDirectusAssetURL(event.logo) : null,
        metadata,
        displayWeight: calculateDisplayWeight('club', description),
      }
    })
  } catch (error) {
    console.error('Error fetching club events:', error)
    return []
  }
}

/**
 * Format date as DD.MM.YYYY for NuLiga form
 */
function formatDateForNuliga(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

/**
 * Normalize whitespace in text
 */
function normalizeText(text: string | null | undefined): string {
  if (text == null) return ''
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Convert relative URL to absolute URL
 */
function absoluteUrl(href: string | null | undefined, baseUrl: string): string | undefined {
  if (!href) return undefined
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return href
  }
}

/**
 * Extract form data from a form node
 */
function extractFormData(formNode: ReturnType<typeof parseHTML>): Record<string, string> {
  const data: Record<string, string> = {}
  const inputs = formNode.querySelectorAll('input[name]')
  for (const input of inputs) {
    const name = input.getAttribute('name')
    if (!name) continue
    const value = input.getAttribute('value') ?? ''
    data[name] = value
  }
  return data
}

/**
 * Parse German date/time format: "Do, 23.01.2025 10:00" or "23.01.2025"
 */
function parseGermanDateTime(value: string | null | undefined): {
  date: string | null
  time: string | null
  jsDate: Date | null
} {
  const raw = normalizeText(value)
  if (!raw) return { date: null, time: null, jsDate: null }

  // Remove weekday if present (e.g., "Do, 23.01.2025" -> "23.01.2025")
  const withoutWeekday = raw.includes(',') ? raw.split(',').slice(1).join(',').trim() : raw
  const parts = withoutWeekday.split(' ')
  const datePart = parts[0]
  const timePart = parts[1] ?? null
  if (!datePart) return { date: null, time: null, jsDate: null }

  const dateMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(datePart)
  if (!dateMatch) return { date: null, time: null, jsDate: null }

  const day = dateMatch[1]
  const month = dateMatch[2]
  const year = dateMatch[3]
  if (!day || !month || !year) return { date: null, time: null, jsDate: null }

  let hour = 0
  let minute = 0
  let hasTime = false

  if (timePart) {
    const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timePart)
    const timeHour = timeMatch?.[1]
    const timeMinute = timeMatch?.[2]
    if (timeHour && timeMinute) {
      hour = Number(timeHour)
      minute = Number(timeMinute)
      hasTime = true
    }
  }

  const jsDate = new Date(Number(year), Number(month) - 1, Number(day), hour, minute)
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const timeStr = hasTime ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` : null

  return { date: dateStr, time: timeStr, jsDate }
}

/**
 * Fetches match data from NuLiga by scraping the HTML table
 */
export async function fetchMatches(
  config: CalendarFetcherConfig,
  options: FetchCalendarOptions = {}
): Promise<CalendarEvent[]> {
  const calendarConfig = await config.fetchCalendarConfig()

  console.log('[fetchMatches] Starting fetch...')
  console.log('[fetchMatches] URL:', calendarConfig.nuligaMatchesUrl)

  if (!calendarConfig.nuligaMatchesUrl) {
    console.warn('[fetchMatches] NuLiga matches URL not configured')
    return []
  }

  const sourceUrl = calendarConfig.nuligaMatchesUrl

  try {
    // Calculate date range for NuLiga query
    const now = new Date()
    const fromDate = options.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const toDate = options.to ?? new Date(now.getFullYear() + 1, 11, 31) // End of next year

    console.log('[fetchMatches] Query date range:', formatDateForNuliga(fromDate), 'to', formatDateForNuliga(toDate))

    // Step 1: Fetch initial page to get form data
    console.log('[fetchMatches] Fetching initial page...')
    const initialResponse = await fetch(sourceUrl, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    } as RequestInit)

    if (!initialResponse.ok) {
      throw new Error(`Failed to fetch initial page: ${initialResponse.status}`)
    }

    const initialHtml = await initialResponse.text()
    const initialRoot = parseHTML(initialHtml)

    // Find the filter form
    const formNode = initialRoot.querySelector('form#meetingsFilterForm')
    const formAction = formNode?.getAttribute('action')

    if (!formNode || !formAction) {
      console.error('[fetchMatches] Filter form not found in page')
      console.log('[fetchMatches] HTML preview:', initialHtml.substring(0, 2000))
      return []
    }

    const formActionUrl = new URL(formAction, sourceUrl).toString()
    const baseFormData = extractFormData(formNode)

    console.log('[fetchMatches] Form action URL:', formActionUrl)
    console.log('[fetchMatches] Base form fields:', Object.keys(baseFormData).length)

    // Step 2: Fetch matches with pagination
    const allEvents: CalendarEvent[] = []
    let offset = 0
    let hasMoreResults = true
    let pageCount = 0

    while (hasMoreResults) {
      pageCount++
      console.log(`[fetchMatches] Fetching page ${pageCount} (offset: ${offset})...`)

      // Build form data with date filters
      const formData: Record<string, string> = { ...baseFormData }
      formData['tx_nuportalrs_clubmeetings[meetingsFilter][fromDate]'] = formatDateForNuliga(fromDate)
      formData['tx_nuportalrs_clubmeetings[meetingsFilter][toDate]'] = formatDateForNuliga(toDate)
      formData['tx_nuportalrs_clubmeetings[meetingsFilter][maxResults]'] = '100'
      formData['tx_nuportalrs_clubmeetings[meetingsFilter][firstResult]'] = offset.toString()

      const body = new URLSearchParams(formData).toString()

      const response = await fetch(formActionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        next: { revalidate: 86400 }, // Cache for 24 hours
      } as RequestInit)

      if (!response.ok) {
        throw new Error(`Failed to fetch page ${pageCount}: ${response.status}`)
      }

      const html = await response.text()
      const root = parseHTML(html)

      // Parse table rows
      const rows = root.querySelectorAll('table tr')
      let pageEvents = 0

      for (const row of rows) {
        const cells = row.querySelectorAll('td')
        if (cells.length < 9) continue

        // Table columns: Date | Group | Home | Guest | Location | Matches | Sets | Games | Status
        const dateText = normalizeText(cells[0]?.text)
        if (!dateText) continue

        const parsed = parseGermanDateTime(dateText)
        if (!parsed.jsDate || !parsed.date) continue

        const groupCell = cells[1]
        const homeCell = cells[2]
        const guestCell = cells[3]

        const groupName = normalizeText(groupCell?.text)
        const groupUrl = absoluteUrl(groupCell?.querySelector('a')?.getAttribute('href'), sourceUrl)

        const homeLink = homeCell?.querySelector('a')
        const homeTeam = normalizeText(homeLink?.text || homeCell?.text)
        const homeTeamUrl = absoluteUrl(homeLink?.getAttribute('href'), sourceUrl)

        const guestLink = guestCell?.querySelector('a')
        const guestTeam = normalizeText(guestLink?.text || guestCell?.text)
        const guestTeamUrl = absoluteUrl(guestLink?.getAttribute('href'), sourceUrl)

        const location = normalizeText(cells[4]?.text)
        const matchesScore = normalizeText(cells[5]?.text)
        const resultCell = cells[8]
        const reportLink = resultCell?.querySelector('a')
        const reportUrl = absoluteUrl(reportLink?.getAttribute('href'), sourceUrl)

        if (!homeTeam || !guestTeam) continue

        // Filter by date range (using options, not query range)
        const filterFrom = options.from ?? new Date(0)
        const filterTo = options.to ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        if (parsed.jsDate < filterFrom || parsed.jsDate > filterTo) continue

        const title = groupName ? `${groupName}: ${homeTeam} vs. ${guestTeam}` : `${homeTeam} vs. ${guestTeam}`
        const isHome = homeTeam.toLowerCase().includes('waiblingen')

        const metadata: MatchEventMetadata = {
          homeTeam,
          homeTeamUrl,
          awayTeam: guestTeam,
          awayTeamUrl: guestTeamUrl,
          result: matchesScore || undefined,
          reportUrl,
          league: groupName || undefined,
          leagueUrl: groupUrl,
          isHome,
        }

        allEvents.push({
          id: `match-${parsed.date}-${homeTeam}-${guestTeam}`.replace(/\s+/g, '-'),
          source: 'match',
          title,
          description: null,
          location: location || null,
          startDate: parsed.jsDate,
          endDate: null,
          startTime: parsed.time,
          endTime: null,
          isAllDay: !parsed.time,
          isMultiDay: false,
          url: null,
          imageUrl: null,
          metadata,
          displayWeight: 2, // Matches always have weight 2
        })

        pageEvents++
      }

      console.log(`[fetchMatches] Page ${pageCount}: parsed ${pageEvents} events`)

      // Check if there are more results
      if (pageEvents === 0 || pageEvents < 100) {
        hasMoreResults = false
      }

      offset += 100

      // Safety break
      if (pageCount > 50) {
        console.warn('[fetchMatches] Safety break: too many pages')
        hasMoreResults = false
      }
    }

    console.log(`[fetchMatches] Total: ${allEvents.length} events from ${pageCount} pages`)

    return allEvents
  } catch (error) {
    console.error('[fetchMatches] Error:', error)
    return []
  }
}

/**
 * Parse date range text from tournament table
 * Handles formats like "Sa, 31.1. – So, 8.2.2026" or "Sa, 15.2.2026"
 */
function parseTournamentDateRange(raw: string): { start: string; end?: string } | null {
  if (!raw) return null

  // Remove weekday prefixes and normalize
  const cleaned = raw

  // Check if it's a date range (contains " – " or " - ")
  const rangeParts = cleaned.split(/\s*[–-]\s*/)

  const rangeStart = rangeParts[0]
  const rangeEnd = rangeParts[1]
  if (rangeParts.length === 2 && rangeStart && rangeEnd) {
    // Remove weekday from each part
    const startPart = rangeStart.includes(',') ? rangeStart.split(',').slice(1).join(',').trim() : rangeStart.trim()
    const endPart = rangeEnd.includes(',') ? rangeEnd.split(',').slice(1).join(',').trim() : rangeEnd.trim()

    // Extract year from end date
    const endYearMatch = /\.(\d{4})$/.exec(endPart)
    const endYear = endYearMatch?.[1] ?? null

    // Normalize dates to YYYY-MM-DD
    const normalizeDate = (dateStr: string, defaultYear: string | null): string | null => {
      const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})?$/.exec(dateStr.trim())
      const dayMatch = match?.[1]
      const monthMatch = match?.[2]
      if (!dayMatch || !monthMatch) return null
      const day = dayMatch.padStart(2, '0')
      const month = monthMatch.padStart(2, '0')
      const year = match?.[3] ?? defaultYear
      if (!year) return null
      return `${year}-${month}-${day}`
    }

    const start = normalizeDate(startPart, endYear)
    const end = normalizeDate(endPart, null)

    if (start) {
      return { start, end: end || undefined }
    }
  } else {
    // Single date - remove weekday if present
    const singlePart = cleaned.includes(',') ? cleaned.split(',').slice(1).join(',').trim() : cleaned.trim()

    const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(singlePart)
    const dayMatch = match?.[1]
    const monthMatch = match?.[2]
    const yearMatch = match?.[3]
    if (dayMatch && monthMatch && yearMatch) {
      const day = dayMatch.padStart(2, '0')
      const month = monthMatch.padStart(2, '0')
      return { start: `${yearMatch}-${month}-${day}` }
    }
  }

  return null
}

/**
 * Parses tournament HTML from WTB into CalendarEvent objects.
 * Extracted for testability — used by fetchTournaments.
 */
function parseTournamentHtml(
  html: string,
  baseUrl: string,
  options: FetchCalendarOptions = {}
): CalendarEvent[] {
  const root = parseHTML(html)
  const calendarEvents: CalendarEvent[] = []
  const rows = root.querySelectorAll('table.tournaments > tbody > tr')

  const from = options.from ?? new Date(0)
  const to = options.to ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

  for (const row of rows) {
    const cells = row.querySelectorAll('td')
    if (cells.length < 2) continue

    // First column: date range (must have daterange class)
    const dateCell = cells[0]
    if (!dateCell) continue
    const dateCellClass = dateCell.getAttribute('class') || ''
    if (!dateCellClass.includes('daterange')) continue

    const dateText = dateCell.text?.replace(/\s+/g, ' ').trim()
    if (!dateText) continue

    // Second column: tournament details
    const detailsCell = cells[1]
    const h2 = detailsCell?.querySelector('h2')
    const link = h2?.querySelector('a')
    const p = detailsCell?.querySelector('p')

    if (!h2 || !link || !p) continue

    const pText = p.text?.trim() || ''

    // Only keep tournaments organized by TC Waiblingen
    if (!pText.includes('Veranstalter: TC Waiblingen')) continue

    const title = link.text?.replace(/\s+/g, ' ').trim() || ''
    const registrationUrl = link.getAttribute('href')
      ? new URL(link.getAttribute('href')!, baseUrl).toString()
      : null

    // Extract "Ausschreibung" link if present
    let callForEntriesUrl: string | null = null
    const ausschreibungLinks = p.querySelectorAll('a')
    for (const aLink of ausschreibungLinks) {
      const linkText = aLink.text?.replace(/\s+/g, ' ').trim() || ''
      if (linkText === 'Ausschreibung') {
        const href = aLink.getAttribute('href')
        if (href) {
          callForEntriesUrl = new URL(href, baseUrl).toString()
        }
        break
      }
    }

    // Parse date range
    const dateRange = parseTournamentDateRange(dateText)
    if (!dateRange) continue

    const startParts = dateRange.start.split('-').map(Number)
    const year = startParts[0]
    const month = startParts[1]
    const day = startParts[2]
    if (year === undefined || month === undefined || day === undefined) continue
    const tournamentStartDate = new Date(year, month - 1, day)

    let tournamentEndDate: Date | null = null
    if (dateRange.end) {
      const endParts = dateRange.end.split('-').map(Number)
      const endYear = endParts[0]
      const endMonth = endParts[1]
      const endDay = endParts[2]
      if (endYear !== undefined && endMonth !== undefined && endDay !== undefined) {
        tournamentEndDate = new Date(endYear, endMonth - 1, endDay)
      }
    }

    // Filter by date range
    if (tournamentStartDate < from || tournamentStartDate > to) continue

    // Extract registration deadline from details
    const deadlineMatch = /Meldeschluss:\s*([^(]+)/.exec(pText)
    const registrationDeadline = deadlineMatch?.[1]?.trim()

    // Extract category/age group from details
    const categoryMatch = /Kategorie:\s*([^,\n]+)/.exec(pText)
    const category = categoryMatch?.[1]?.trim()

    // Build description: only keep lines starting with "Meldeschluss:"
    // and remove "(Offen für: xxx)" text
    let description: string | null =
      pText
        .split(/\n/g)
        .filter((line) => line.trim().startsWith('Meldeschluss:'))
        .join(', ') || null

    if (description) {
      description = description.replace(/\(Offen für:.*?\)/g, '').trim() || null
    }

    const metadata: TournamentEventMetadata = {
      category,
      registrationDeadline,
      callForEntriesUrl: callForEntriesUrl || undefined,
      registrationUrl: registrationUrl || undefined,
    }

    // Check if tournament spans multiple days
    const isMultiDay = !!(
      tournamentEndDate &&
      (tournamentStartDate.getFullYear() !== tournamentEndDate.getFullYear() ||
        tournamentStartDate.getMonth() !== tournamentEndDate.getMonth() ||
        tournamentStartDate.getDate() !== tournamentEndDate.getDate())
    )

    calendarEvents.push({
      id: `tournament-${dateRange.start}-${title}`.replace(/\s+/g, '-'),
      source: 'tournament',
      title,
      description,
      location: 'Tennis-Club Waiblingen e.V.',
      startDate: tournamentStartDate,
      endDate: tournamentEndDate,
      startTime: null,
      endTime: null,
      isAllDay: true,
      isMultiDay,
      url: registrationUrl,
      imageUrl: null,
      metadata,
      displayWeight: 2, // Tournaments always have weight 2
    })
  }

  return calendarEvents
}

/**
 * Fetches tournament data from WTB by scraping the HTML
 * Uses form-based filtering to get tournaments in Waiblingen
 */
export async function fetchTournaments(
  config: CalendarFetcherConfig,
  options: FetchCalendarOptions = {}
): Promise<CalendarEvent[]> {
  const calendarConfig = await config.fetchCalendarConfig()

  if (!calendarConfig.wtbTournamentsUrl) {
    console.warn('[fetchTournaments] WTB tournaments URL not configured')
    return []
  }

  const baseUrl = new URL(calendarConfig.wtbTournamentsUrl).origin

  // Calculate date range
  const now = new Date()
  const startDate = new Date(now)
  startDate.setMonth(startDate.getMonth() - 1)
  const endDate = new Date(now)
  endDate.setFullYear(endDate.getFullYear() + 1)

  const formatDateDE = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear())
    return `${day}.${month}.${year}`
  }

  try {
    console.log('[fetchTournaments] Fetching initial page...')

    // Step 1: Fetch initial page to get the form
    const initialResponse = await fetch(calendarConfig.wtbTournamentsUrl, {
      next: { revalidate: 14400 }, // Cache for 4 hours
    } as RequestInit)

    if (!initialResponse.ok) {
      throw new Error(`Failed to fetch initial page: ${initialResponse.status}`)
    }

    const initialHtml = await initialResponse.text()
    const initialRoot = parseHTML(initialHtml)

    // Find the filter form
    const formNode = initialRoot.querySelector('form#tournamentsFilterForm')
    const formAction = formNode?.getAttribute('action')

    if (!formNode || !formAction) {
      throw new Error('Tournament filter form not found')
    }

    const formActionUrl = new URL(formAction, calendarConfig.wtbTournamentsUrl).toString()

    // Extract base form data (hidden fields)
    const baseFormData: Record<string, string> = {}
    const inputs = formNode.querySelectorAll('input[name]')
    for (const input of inputs) {
      const name = input.getAttribute('name')
      if (name) {
        baseFormData[name] = input.getAttribute('value') ?? ''
      }
    }

    console.log(`[fetchTournaments] Fetching tournaments from ${formatDateDE(startDate)} to ${formatDateDE(endDate)}...`)

    // Step 2: Submit form with filter parameters
    const formData = new URLSearchParams()
    for (const [key, value] of Object.entries(baseFormData)) {
      formData.append(key, value)
    }

    // Add filter parameters
    formData.set('tx_nuportalrs_tournaments[tournamentsFilter][ageCategory]', '')
    formData.set('tx_nuportalrs_tournaments[tournamentsFilter][fedRank]', '')
    formData.set('tx_nuportalrs_tournaments[tournamentsFilter][region]', '')
    formData.set('tx_nuportalrs_tournaments[tournamentsFilter][circuit]', '')
    formData.set('tx_nuportalrs_tournaments[tournamentsFilter][type]', '')
    formData.set('tx_nuportalrs_tournaments[tournamentsFilter][city]', 'Waiblingen')
    formData.set('tx_nuportalrs_tournaments[tournamentsFilter][startDate]', formatDateDE(startDate))
    formData.set('tx_nuportalrs_tournaments[tournamentsFilter][endDate]', formatDateDE(endDate))

    const response = await fetch(formActionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      next: { revalidate: 14400 },
    } as RequestInit)

    if (!response.ok) {
      throw new Error(`Failed to fetch tournaments: ${response.status}`)
    }

    const html = await response.text()
    const calendarEvents = parseTournamentHtml(html, baseUrl, options)

    console.log(`[fetchTournaments] Parsed ${calendarEvents.length} tournaments`)
    return calendarEvents
  } catch (error) {
    console.error('[fetchTournaments] Error:', error)
    return []
  }
}

/**
 * Fetches completed match results from the past months
 * @param months Number of months to look back (default: 2)
 * @param limit Maximum number of results to return (default: 12)
 */
export async function fetchMatchResults(
  config: CalendarFetcherConfig,
  months: number = 2,
  limit: number = 12
): Promise<CalendarEvent[]> {
  const now = new Date()
  const from = new Date(now)
  from.setMonth(from.getMonth() - months)

  const matches = await fetchMatches(config, { from, to: now })

  // Filter for matches with results and sort by date descending (most recent first)
  const completedMatches = matches
    .filter((match) => {
      const metadata = match.metadata as MatchEventMetadata
      return metadata.result && metadata.result.trim() !== ''
    })
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
    .slice(0, limit)

  return completedMatches
}

/**
 * Fetches all calendar events from all sources in parallel
 */
export async function fetchAllCalendarEvents(
  config: CalendarFetcherConfig,
  options: FetchCalendarOptions = {}
): Promise<CalendarEvent[]> {
  console.log('[fetchAllCalendarEvents] Starting fetch with options:', options)
  const results = await Promise.allSettled([
    fetchAppCalendarEvents(config, options),
    fetchClubEvents(config, options),
    fetchMatches(config, options),
    fetchTournaments(config, options),
  ])

  const allEvents: CalendarEvent[] = []

  const sources = ['app', 'club', 'match', 'tournament']
  for (let i = 0; i < results.length; i++) {
    const result = results[i]!
    if (result.status === 'fulfilled') {
      console.log(`[fetchAllCalendarEvents] ${sources[i]}: ${result.value.length} events`)
      allEvents.push(...result.value)
    } else {
      console.error(`[fetchAllCalendarEvents] ${sources[i]} failed:`, result.reason)
    }
  }

  // Sort by start date
  allEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  return allEvents
}

// Export helper functions for testing
export const _testHelpers = {
  formatTime,
  decodeHtmlText,
  parseDirectusDateTime,
  parseIcalAttachments,
  formatDateForNuliga,
  normalizeText,
  absoluteUrl,
  parseGermanDateTime,
  parseTournamentDateRange,
  parseTournamentHtml,
}
