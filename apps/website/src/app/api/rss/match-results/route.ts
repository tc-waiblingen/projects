import { NextRequest, NextResponse } from 'next/server'
import { fetchMatchResults } from '@/lib/directus/calendar-fetchers'
import { getDirectus } from '@/lib/directus/directus'
import { isMatchPlayed } from '@/lib/match-utils'
import { publicOrigin } from '@/lib/public-url'
import type { MatchEventMetadata } from '@tcw/calendar'
import type { Global } from '@/types/directus-schema'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatRFC822Date(date: Date): string {
  return date.toUTCString()
}

function extractMeetingId(reportUrl: string | undefined): string | null {
  if (!reportUrl) return null
  try {
    const url = new URL(reportUrl)
    return url.searchParams.get('meeting')
  } catch {
    return null
  }
}

async function fetchGlobalSettings(): Promise<{ clubName: string; website: string }> {
  const { directus, readSingleton } = getDirectus()

  try {
    const global = await directus.request(
      readSingleton('global', {
        fields: ['club_name', 'website'],
      })
    ) as Global

    return {
      clubName: global.club_name || 'TC Waiblingen',
      website: global.website || 'https://tc-waiblingen.de',
    }
  } catch (error) {
    console.error('Error fetching global settings:', error)
    return {
      clubName: 'TC Waiblingen',
      website: 'https://tc-waiblingen.de',
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team')

    // Fetch global settings and match results in parallel
    const [globalSettings, allResults] = await Promise.all([
      fetchGlobalSettings(),
      fetchMatchResults(6, 50),
    ])

    // Filter by teamId if specified
    const results = teamId
      ? allResults.filter((match) => {
        const metadata = match.metadata as MatchEventMetadata
        return metadata.teamId === teamId
      })
      : allResults

    const baseUrl = publicOrigin(request)
    const imageUrl = `${baseUrl}/assets/logo/tcw-crest.png`
    const selfUrl = `${baseUrl}${new URL(request.url).pathname}${new URL(request.url).search}`

    // Derive a display name for the selected team from the first match's metadata
    const teamLabel = teamId
      ? ((results[0]?.metadata as MatchEventMetadata | undefined)?.teamName ?? teamId)
      : null

    const feedTitle = teamLabel
      ? `${globalSettings.clubName} - Spielergebnisse (${teamLabel})`
      : `${globalSettings.clubName} - Spielergebnisse`
    const feedLink = `${baseUrl}/spielergebnisse`
    const feedDescription = teamLabel
      ? `Aktuelle Spielergebnisse des ${globalSettings.clubName} für ${teamLabel}`
      : `Aktuelle Spielergebnisse des ${globalSettings.clubName}`

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${escapeXml(feedLink)}</link>
    <description>${escapeXml(feedDescription)}</description>
    <language>de-de</language>
    <lastBuildDate>${formatRFC822Date(new Date())}</lastBuildDate>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${escapeXml(imageUrl)}</url>
      <title>${escapeXml(globalSettings.clubName)}</title>
      <link>${escapeXml(globalSettings.website)}</link>
    </image>
`

    for (const match of results) {
      const metadata = match.metadata as MatchEventMetadata
      const matchPlayed = isMatchPlayed(metadata.result, metadata.reportUrl)
      const homeAway = metadata.isHome ? 'Heimspiel' : 'Auswärtsspiel'

      // Only show score in title if match has been played
      const titlePrefix = metadata.group || metadata.league
      const itemTitle = matchPlayed
        ? (titlePrefix
          ? `${titlePrefix}: ${metadata.homeTeam} vs. ${metadata.awayTeam} - ${metadata.result}`
          : `${metadata.homeTeam} vs. ${metadata.awayTeam} - ${metadata.result}`)
        : (titlePrefix
          ? `${titlePrefix}: ${metadata.homeTeam} vs. ${metadata.awayTeam}`
          : `${metadata.homeTeam} vs. ${metadata.awayTeam}`)

      const itemLink = metadata.reportUrl || feedLink

      // Build description with links
      const descParts: string[] = []
      if (metadata.league && metadata.leagueUrl) {
        descParts.push(`<p><a href="${metadata.leagueUrl}">${metadata.league}</a></p>`)
      } else if (metadata.league) {
        descParts.push(`<p>${metadata.league}</p>`)
      }

      const homeLink = metadata.homeTeamUrl
        ? `<a href="${metadata.homeTeamUrl}">${metadata.homeTeam}</a>`
        : metadata.homeTeam
      const awayLink = metadata.awayTeamUrl
        ? `<a href="${metadata.awayTeamUrl}">${metadata.awayTeam}</a>`
        : metadata.awayTeam
      descParts.push(`<p>${homeLink} vs. ${awayLink}</p>`)

      // Only show result if match has been played
      if (matchPlayed) {
        descParts.push(`<p>Ergebnis: ${metadata.result} (${homeAway})</p>`)
      } else {
        descParts.push(`<p>${homeAway}</p>`)
      }

      if (metadata.reportUrl) {
        const reportLabel = matchPlayed ? 'Spielbericht' : 'Spielberichts-Vorlage'
        descParts.push(`<p><a href="${metadata.reportUrl}">${reportLabel}</a></p>`)
      }

      const description = descParts.join('\n')

      // Extract meeting ID for guid, fallback to match id
      const meetingId = extractMeetingId(metadata.reportUrl)
      const guid = meetingId || match.id

      xml += `    <item>
      <title>${escapeXml(itemTitle)}</title>
      <link>${escapeXml(itemLink)}</link>
      <pubDate>${formatRFC822Date(match.startDate)}</pubDate>
      <description><![CDATA[${description}]]></description>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
    </item>
`
    }

    xml += `  </channel>
</rss>`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('RSS generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate RSS feed' },
      { status: 500 }
    )
  }
}
