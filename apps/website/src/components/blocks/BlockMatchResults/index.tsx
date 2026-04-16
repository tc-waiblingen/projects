import type { BlockMatchResult as BlockMatchResultType } from '@/types/directus-schema'
import type { CalendarEvent, MatchEventMetadata } from '@tcw/calendar'
import { Section } from '@/components/elements/section'
import { fetchMatchResults } from '@/lib/directus/calendar-fetchers'
import { teamLabelWithGroup } from '@/lib/team-label'
import { MatchResultsClient, type TeamEntry } from './MatchResultsClient'

interface BlockMatchResultsProps {
  data: BlockMatchResultType
}

function extractTeamEntries(results: CalendarEvent[]): TeamEntry[] {
  const seen = new Map<string, TeamEntry>()

  for (const match of results) {
    const meta = match.metadata as MatchEventMetadata
    if (!meta.teamId || !meta.teamName) continue
    if (seen.has(meta.teamId)) continue
    seen.set(meta.teamId, {
      value: meta.teamId,
      label: teamLabelWithGroup(meta.teamName, meta.group),
      seasonSort: meta.seasonSort ?? Number.MAX_SAFE_INTEGER,
    })
  }

  return Array.from(seen.values()).sort((a, b) => {
    if (a.seasonSort !== b.seasonSort) return b.seasonSort - a.seasonSort
    return a.label.localeCompare(b.label, 'de')
  })
}

export async function BlockMatchResults({ data }: BlockMatchResultsProps) {
  const { id, headline, tagline, alignment } = data

  const results = await fetchMatchResults()

  if (results.length === 0) {
    return null
  }

  const teamEntries = extractTeamEntries(results)

  return (
    <Section headline={headline} eyebrow={tagline} alignment={alignment} editAttr={{ collection: 'block_match_results', item: String(id) }}>
      <MatchResultsClient results={results} teamEntries={teamEntries} />
    </Section>
  )
}
