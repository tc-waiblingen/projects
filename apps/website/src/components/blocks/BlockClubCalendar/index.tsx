import type { BlockClubCalendar as BlockClubCalendarType } from '@/types/directus-schema'
import type { CalendarEvent, MatchEventMetadata } from '@tcw/calendar'
import { Section } from '@/components/elements/section'
import { fetchAllCalendarEvents } from '@/lib/directus/calendar-fetchers'
import { getEditAttr } from '@/lib/visual-editing'
import { CalendarClient } from './CalendarClient'

interface BlockClubCalendarProps {
  data: BlockClubCalendarType
}

function getCalendarDateRange(): { from: Date; to: Date; now: Date } {
  const now = new Date()
  const currentYear = now.getFullYear()
  const from = new Date(currentYear, 0, 1)
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59)
  const twelveMonthsFromNow = new Date(now)
  twelveMonthsFromNow.setFullYear(twelveMonthsFromNow.getFullYear() + 1)
  const to = endOfYear > twelveMonthsFromNow ? endOfYear : twelveMonthsFromNow
  return { from, to, now }
}

function extractGroupNames(events: CalendarEvent[]): string[] {
  const groupSet = new Set<string>()

  for (const event of events) {
    if (event.source === 'match') {
      const metadata = event.metadata as MatchEventMetadata
      if (metadata.league) {
        groupSet.add(metadata.league)
      }
    }
  }

  return Array.from(groupSet).sort((a, b) => a.localeCompare(b, 'de'))
}

export async function BlockClubCalendar({ data }: BlockClubCalendarProps) {
  const { id, headline, tagline, alignment } = data

  const dateRange = getCalendarDateRange()
  const events = await fetchAllCalendarEvents(dateRange)
  const groupNames = extractGroupNames(events)
  const serverNow = dateRange.now.getTime()

  const headlineEl = headline ? (
    <span data-directus={getEditAttr({ collection: 'block_club_calendar', item: String(id), fields: 'headline' })}>
      {headline}
    </span>
  ) : undefined

  const eyebrowEl = tagline ? (
    <span data-directus={getEditAttr({ collection: 'block_club_calendar', item: String(id), fields: 'tagline' })}>
      {tagline}
    </span>
  ) : undefined

  return (
    <Section headline={headlineEl} eyebrow={eyebrowEl} alignment={alignment}>
      <CalendarClient events={events} groupNames={groupNames} serverNow={serverNow} />
    </Section>
  )
}
