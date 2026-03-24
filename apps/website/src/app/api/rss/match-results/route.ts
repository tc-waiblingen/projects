import { NextRequest, NextResponse } from 'next/server'
import { fetchMatchResults } from '@/lib/directus/calendar-fetchers'
import { getDirectus } from '@/lib/directus/directus'
import { isMatchPlayed } from '@/lib/match-utils'
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
    const group = searchParams.get('group')

    // Fetch global settings and match results in parallel
    const [globalSettings, allResults] = await Promise.all([
      fetchGlobalSettings(),
      fetchMatchResults(6, 50),
    ])

    // Filter by group if specified
    const results = group
      ? allResults.filter((match) => {
        const metadata = match.metadata as MatchEventMetadata
        return metadata.league === group || metadata.leagueFull === group
      })
      : allResults

    // Use request URL to determine the current host
    const requestUrl = new URL(request.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    const imageUrl = `${baseUrl}/assets/logo/tcw-crest.png`

    const feedTitle = group
      ? `${globalSettings.clubName} - Spielergebnisse (${group})`
      : `${globalSettings.clubName} - Spielergebnisse`
    const feedLink = `${baseUrl}/spielergebnisse`
    const feedDescription = group
      ? `Aktuelle Spielergebnisse des ${globalSettings.clubName} für ${group}`
      : `Aktuelle Spielergebnisse des ${globalSettings.clubName}`

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${escapeXml(feedLink)}</link>
    <description>${escapeXml(feedDescription)}</description>
    <language>de-de</language>
    <lastBuildDate>${formatRFC822Date(new Date())}</lastBuildDate>
    <atom:link href="${escapeXml(request.url)}" rel="self" type="application/rss+xml"/>
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
      const itemTitle = matchPlayed
        ? (metadata.league
          ? `${metadata.league}: ${metadata.homeTeam} vs. ${metadata.awayTeam} - ${metadata.result}`
          : `${metadata.homeTeam} vs. ${metadata.awayTeam} - ${metadata.result}`)
        : (metadata.league
          ? `${metadata.league}: ${metadata.homeTeam} vs. ${metadata.awayTeam}`
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
