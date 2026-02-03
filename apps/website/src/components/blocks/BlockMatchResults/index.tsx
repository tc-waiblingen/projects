import type { BlockMatchResult as BlockMatchResultType } from '@/types/directus-schema'
import type { CalendarEvent, MatchEventMetadata } from '@tcw/calendar'
import { Section } from '@/components/elements/section'
import { fetchMatchResults } from '@/lib/directus/calendar-fetchers'
import { getEditAttr } from '@/lib/visual-editing'
import { MatchResultsClient } from './MatchResultsClient'

interface BlockMatchResultsProps {
  data: BlockMatchResultType
}

function extractGroupNames(results: CalendarEvent[]): string[] {
  const groupSet = new Set<string>()

  for (const match of results) {
    const metadata = match.metadata as MatchEventMetadata
    if (metadata.league) {
      groupSet.add(metadata.league)
    }
  }

  return Array.from(groupSet).sort((a, b) => a.localeCompare(b, 'de'))
}

export async function BlockMatchResults({ data }: BlockMatchResultsProps) {
  const { id, headline, tagline, alignment } = data

  const results = await fetchMatchResults()

  if (results.length === 0) {
    return null
  }

  const groupNames = extractGroupNames(results)

  const headlineEl = headline ? (
    <span data-directus={getEditAttr({ collection: 'block_match_results', item: String(id), fields: 'headline' })}>
      {headline}
    </span>
  ) : undefined

  const eyebrowEl = tagline ? (
    <span data-directus={getEditAttr({ collection: 'block_match_results', item: String(id), fields: 'tagline' })}>
      {tagline}
    </span>
  ) : undefined

  return (
    <Section headline={headlineEl} eyebrow={eyebrowEl} alignment={alignment}>
      <MatchResultsClient results={results} groupNames={groupNames} />
    </Section>
  )
}
