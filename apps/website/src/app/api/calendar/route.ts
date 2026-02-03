import { NextRequest, NextResponse } from 'next/server'
import ical, { ICalCalendarMethod, ICalEventStatus } from 'ical-generator'
import { fetchAllCalendarEvents } from '@/lib/directus/calendar-fetchers'
import { isMatchPlayed } from '@/lib/match-utils'
import type {
  CalendarEvent,
  CalendarEventSource,
  ClubEventMetadata,
  MatchEventMetadata,
  TournamentEventMetadata,
} from '@tcw/calendar'

type CategoryFilter = 'matches' | 'tournaments' | 'club' | 'beginners' | 'children'

function getSourceForCategory(category: CategoryFilter): CalendarEventSource[] {
  switch (category) {
    case 'matches':
      return ['match']
    case 'tournaments':
      return ['tournament']
    case 'club':
      return ['club', 'app']
    case 'beginners':
    case 'children':
      return ['club']
    default:
      return []
  }
}

function getCalendarName(category: CategoryFilter | null, group: string | null): string {
  const baseName = 'TCW-Vereinskalender'

  if (group) {
    return `${baseName} (${group})`
  }

  if (category) {
    const categoryLabels: Record<CategoryFilter, string> = {
      matches: 'Punktspiele',
      tournaments: 'Turniere',
      club: 'Vereinstermine',
      beginners: 'Für Einsteiger',
      children: 'Kinder',
    }
    return `${baseName} (${categoryLabels[category]})`
  }

  return baseName
}

function filterEvents(
  events: CalendarEvent[],
  category: CategoryFilter | null,
  group: string | null
): CalendarEvent[] {
  let filtered = events

  if (category) {
    const sources = getSourceForCategory(category)
    filtered = filtered.filter((e) => sources.includes(e.source))

    // Additional filtering for beginners/children categories
    if (category === 'beginners' || category === 'children') {
      filtered = filtered.filter((e) => {
        const meta = e.metadata as ClubEventMetadata
        return meta.category === category
      })
    }
  }

  // Group filter (only applies to match events, filters by league name)
  if (group) {
    filtered = filtered.filter((e) => {
      if (e.source !== 'match') return false
      const meta = e.metadata as { league?: string }
      return meta.league === group
    })
  }

  return filtered
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as CategoryFilter | null
    const group = searchParams.get('group')

    const allEvents = await fetchAllCalendarEvents()
    const events = filterEvents(allEvents, category, group)

    const calendarName = getCalendarName(category, group)

    const calendar = ical({
      name: calendarName,
      timezone: 'Europe/Berlin',
      method: ICalCalendarMethod.PUBLISH,
      prodId: {
        company: 'TC Waiblingen e.V.',
        product: 'Club Calendar',
      },
    })

    for (const event of events) {
      // Ensure dates are valid Date objects (they may be strings after serialization)
      const startDate = new Date(event.startDate)
      if (isNaN(startDate.getTime())) {
        console.warn(`Skipping event with invalid start date: ${event.id}`)
        continue
      }

      let endDate = startDate
      let hasExplicitEndDate = false
      if (event.endDate) {
        const parsedEnd = new Date(event.endDate)
        if (!isNaN(parsedEnd.getTime())) {
          endDate = parsedEnd
          hasExplicitEndDate = true
        }
      }

      // For all-day events, iCal DTEND is exclusive (the day after the last day)
      if (event.isAllDay) {
        endDate = new Date(endDate)
        endDate.setDate(endDate.getDate() + 1)
      } else if (!hasExplicitEndDate) {
        // Set default duration for timed events without an end date
        endDate = new Date(startDate)
        const isYouthMatch = /U(?:8|9|10)\b/.test(event.title)
        const durationHours = event.source === 'match' ? (isYouthMatch ? 3 : 5) : 1
        endDate.setHours(endDate.getHours() + durationHours)
      }

      // Determine URL and metadata for matches
      let eventUrl = event.url
      let matchMeta: MatchEventMetadata | null = null
      let matchPlayed = false
      if (event.source === 'match') {
        matchMeta = event.metadata as MatchEventMetadata
        eventUrl = matchMeta.leagueUrl ?? null
        matchPlayed = isMatchPlayed(matchMeta.result, matchMeta.reportUrl)
      }

      // Build summary - add score only for played matches
      let summary = event.title
      if (matchMeta?.result && matchPlayed) {
        summary = `${event.title} (${matchMeta.result})`
      }

      let description = event.description ?? ''

      // Add result to description only for played matches
      if (matchMeta?.result && matchPlayed) {
        description += description ? '\n\n' : ''
        description += `Ergebnis: ${matchMeta.result}`
        if (matchMeta.reportUrl) {
          description += `\nSpielbericht: ${matchMeta.reportUrl}`
        }
      } else if (matchMeta?.reportUrl) {
        // Match not played yet - link to report template
        description += description ? '\n\n' : ''
        description += `Spielberichts-Vorlage: ${matchMeta.reportUrl}`
      }

      // Add tournament links for tournament events
      if (event.source === 'tournament') {
        const meta = event.metadata as TournamentEventMetadata
        const links: string[] = []
        if (meta.callForEntriesUrl) {
          links.push(`Ausschreibung: ${meta.callForEntriesUrl}`)
        }
        if (meta.registrationUrl) {
          links.push(`Anmeldung: ${meta.registrationUrl}`)
        }
        if (links.length > 0) {
          description += description ? '\n\n' : ''
          description += links.join('\n')
        }
      } else if (eventUrl) {
        description += description ? '\n\n' : ''
        description += `Mehr: ${eventUrl}`
      }

      calendar.createEvent({
        id: event.id,
        summary: summary,
        description: description || undefined,
        location: event.location ?? undefined,
        start: startDate,
        end: endDate,
        allDay: event.isAllDay,
        status: ICalEventStatus.CONFIRMED,
        url: eventUrl ?? undefined,
      })
    }

    const icsContent = calendar.toString()

    // Generate a safe filename from the calendar name
    const filename = calendarName
      .toLowerCase()
      .replace(/[^a-z0-9äöüß-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.ics"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('iCal generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate calendar' },
      { status: 500 }
    )
  }
}
