import type { BlockClubCalendar as BlockClubCalendarType } from '@/types/directus-schema'
import type { CalendarEvent, MatchEventMetadata } from '@tcw/calendar'
import { Section } from '@/components/elements/section'
import { fetchAllCalendarEvents } from '@/lib/directus/calendar-fetchers'
import { CalendarClient } from './CalendarClient'
import type { GroupEntry } from './FilterControls'

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

function extractGroupEntries(events: CalendarEvent[]): GroupEntry[] {
  const seen = new Map<string, GroupEntry>()

  for (const event of events) {
    if (event.source === 'match') {
      const meta = event.metadata as MatchEventMetadata
      const league = meta.leagueFull || meta.league
      if (!league) continue
      const key = `${meta.season ?? ''}|${league}|${meta.district ?? ''}`
      if (!seen.has(key)) {
        const label = meta.district ? `${league} (${meta.district})` : league
        seen.set(key, { value: league, label, season: meta.season })
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label, 'de'))
}

export async function BlockClubCalendar({ data }: BlockClubCalendarProps) {
  const { id, headline, tagline, alignment, filter_category, style } = data

  const dateRange = getCalendarDateRange()
  const events = await fetchAllCalendarEvents(dateRange)
  const groupEntries = extractGroupEntries(events)
  const serverNow = dateRange.now.getTime()

  return (
    <Section headline={headline} eyebrow={tagline} alignment={alignment} editAttr={{ collection: 'block_club_calendar', item: String(id) }}>
      <CalendarClient
        events={events}
        groupEntries={groupEntries}
        serverNow={serverNow}
        filterCategory={filter_category ?? undefined}
        style={style ?? 'default'}
        alignment={alignment ?? 'left'}
      />
    </Section>
  )
}
