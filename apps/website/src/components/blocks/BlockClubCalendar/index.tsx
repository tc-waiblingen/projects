import type { BlockClubCalendar as BlockClubCalendarType } from '@/types/directus-schema'
import type { CalendarEvent, MatchChangeSummaryGroup, MatchEventMetadata } from '@tcw/calendar'
import {
  buildMatchChangeSummary,
  fetchNrMatchChanges,
  fetchNrMatchesResponse,
  fetchNrTeams,
} from '@tcw/calendar'
import { Section } from '@/components/elements/section'
import { fetchAllCalendarEvents } from '@/lib/directus/calendar-fetchers'
import { fetchCourtsWithSponsors } from '@/lib/directus/fetchers'
import { logger } from '@/lib/logger'
import { teamLabelWithGroup } from '@/lib/team-label'
import { CalendarClient } from './CalendarClient'
import { CourtUsageChanges } from './CourtUsageChanges'
import { CourtUsageClient } from './CourtUsageClient'
import type { TeamEntry } from './FilterControls'

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

async function fetchMatchChangeGroups(dateRange: {
  from: Date
  to: Date
  now: Date
}): Promise<{ groups: MatchChangeSummaryGroup[]; matchesLastRefreshedAt: string | null }> {
  const thirtyDaysAgo = new Date(dateRange.now.getTime() - 30 * 24 * 60 * 60 * 1000)
  try {
    const [changes, matchesResponse, teams] = await Promise.all([
      fetchNrMatchChanges({
        since: thirtyDaysAgo,
        fields: ['__created', 'match_date', 'match_time', 'location'],
      }),
      fetchNrMatchesResponse(dateRange.from, dateRange.to),
      fetchNrTeams(),
    ])
    const groups = buildMatchChangeSummary({
      changes,
      matches: matchesResponse.items,
      teams,
      formatTeamLabel: (team) => teamLabelWithGroup(team.name, team.group),
    })
    return { groups, matchesLastRefreshedAt: matchesResponse.lastRefreshedAt }
  } catch (error) {
    logger.warn('Failed to load match changes', error)
    return { groups: [], matchesLastRefreshedAt: null }
  }
}

function extractTeamEntries(events: CalendarEvent[]): TeamEntry[] {
  const seen = new Map<string, TeamEntry>()

  for (const event of events) {
    if (event.source !== 'match') continue
    const meta = event.metadata as MatchEventMetadata
    if (!meta.teamId || !meta.teamName) continue
    if (seen.has(meta.teamId)) continue
    seen.set(meta.teamId, {
      value: meta.teamId,
      label: teamLabelWithGroup(meta.teamName, meta.group),
      season: meta.season,
      seasonSort: meta.seasonSort ?? Number.MAX_SAFE_INTEGER,
    })
  }

  return Array.from(seen.values()).sort((a, b) => {
    if (a.seasonSort !== b.seasonSort) return b.seasonSort - a.seasonSort
    return a.label.localeCompare(b.label, 'de')
  })
}

export async function BlockClubCalendar({ data }: BlockClubCalendarProps) {
  const { id, headline, tagline, alignment, filter_category, style } = data

  const dateRange = getCalendarDateRange()

  if (style === 'court_usage') {
    const [events, courts, matchChanges] = await Promise.all([
      fetchAllCalendarEvents(dateRange),
      fetchCourtsWithSponsors(),
      fetchMatchChangeGroups(dateRange),
    ])
    const indoorCourtCount = courts.filter((c) => c.type === 'tennis_indoor').length
    const outdoorCourtCount = courts.filter((c) => c.type === 'tennis_outdoor').length

    const { groups: changeGroups, matchesLastRefreshedAt } = matchChanges
    const matchesLastRefreshedAtDisplay = matchesLastRefreshedAt
      ? new Date(matchesLastRefreshedAt).toLocaleString('de-DE', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Europe/Berlin',
        })
      : null

    return (
      <Section headline={headline} eyebrow={tagline} alignment={alignment} editAttr={{ collection: 'block_club_calendar', item: String(id) }}>
        <CourtUsageClient
          events={events}
          indoorCourtCount={indoorCourtCount}
          outdoorCourtCount={outdoorCourtCount}
          serverNow={dateRange.now.getTime()}
          matchesLastRefreshedAt={matchesLastRefreshedAtDisplay}
        />
        <CourtUsageChanges groups={changeGroups} now={dateRange.now} />
      </Section>
    )
  }

  const events = await fetchAllCalendarEvents(dateRange)
  const teamEntries = extractTeamEntries(events)
  const serverNow = dateRange.now.getTime()

  return (
    <Section headline={headline} eyebrow={tagline} alignment={alignment} editAttr={{ collection: 'block_club_calendar', item: String(id) }}>
      <CalendarClient
        events={events}
        teamEntries={teamEntries}
        serverNow={serverNow}
        filterCategory={filter_category ?? undefined}
        style={style ?? 'default'}
        alignment={alignment ?? 'left'}
      />
    </Section>
  )
}
