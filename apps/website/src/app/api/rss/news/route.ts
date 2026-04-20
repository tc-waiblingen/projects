import { NextRequest, NextResponse } from 'next/server'
import { fetchPostsForRSS } from '@/lib/directus/fetchers'
import { getDirectus } from '@/lib/directus/directus'
import { publicOrigin } from '@/lib/public-url'
import type { DirectusFile, Global } from '@/types/directus-schema'

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

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateExcerpt(
  text: string,
  postUrl: string,
  postTitle: string,
  wordLimit = 55
): string {
  const words = text.split(/\s+/)
  if (words.length <= wordLimit) {
    return text
  }
  const truncated = words.slice(0, wordLimit).join(' ')
  return `${truncated} ... <a title="${postTitle}" class="read-more" href="${postUrl}">Weiterlesen</a>`
}

function joinUrl(base: string, path: string): string {
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanBase}${cleanPath}`
}

async function fetchGlobalSettings(): Promise<{
  clubName: string
  website: string
  tagline: string
}> {
  const { directus, readSingleton } = getDirectus()

  try {
    const global = (await directus.request(
      readSingleton('global', {
        fields: ['club_name', 'website', 'tagline'],
      })
    )) as Global

    return {
      clubName: global.club_name || 'TC Waiblingen',
      website: global.website || 'https://tc-waiblingen.de',
      tagline: global.tagline || 'Hier spielt das Leben!',
    }
  } catch (error) {
    console.error('Error fetching global settings:', error)
    return {
      clubName: 'TC Waiblingen',
      website: 'https://tc-waiblingen.de',
      tagline: 'Hier spielt das Leben!',
    }
  }
}

function getPostPath(slug: string, publishedAt: string | null): string {
  if (publishedAt) {
    const year = new Date(publishedAt).getFullYear()
    return `/news/${year}/${slug}`
  }
  return `/news/${slug}`
}

export async function GET(request: NextRequest) {
  try {
    // Fetch global settings and posts in parallel
    const [globalSettings, posts] = await Promise.all([
      fetchGlobalSettings(),
      fetchPostsForRSS(10),
    ])

    const baseUrl = publicOrigin(request)
    const imageUrl = `${baseUrl}/assets/logo/tcw-crest.png`
    const feedUrl = `${baseUrl}/api/rss/news`

    const feedTitle = `${globalSettings.clubName} - News`
    const feedLink = globalSettings.website
    const feedDescription = globalSettings.tagline

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
	xmlns:content="http://purl.org/rss/1.0/modules/content/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:atom="http://www.w3.org/2005/Atom"
	xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
>

<channel>
	<title>${escapeXml(feedTitle)}</title>
	<atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
	<link>${escapeXml(feedLink)}</link>
	<description>${escapeXml(feedDescription)}</description>
	<lastBuildDate>${formatRFC822Date(new Date())}</lastBuildDate>
	<language>de</language>
	<sy:updatePeriod>hourly</sy:updatePeriod>
	<sy:updateFrequency>1</sy:updateFrequency>

<image>
	<url>${escapeXml(imageUrl)}</url>
	<title>${escapeXml(feedTitle)}</title>
	<link>${escapeXml(feedLink)}</link>
</image>
`

    for (const post of posts) {
      // Skip posts without a slug
      if (!post.slug) continue

      const postPath = getPostPath(post.slug, post.published_at ?? null)
      const postUrl = joinUrl(globalSettings.website, postPath)
      const pubDate = post.published_at
        ? formatRFC822Date(new Date(post.published_at))
        : formatRFC822Date(new Date())

      const plainText = stripHtmlTags(post.content || '')
      const excerpt = truncateExcerpt(plainText, postUrl, post.title)

      const image =
        post.image && typeof post.image !== 'string'
          ? (post.image as DirectusFile)
          : null
      const imageSrc = image?.id ? `${baseUrl}/api/images/${image.id}` : null
      const imageAlt = image?.description || image?.title || post.title
      const imageMime = image?.type || 'image/jpeg'
      const imageSize = image?.filesize ?? 0

      const enclosure = imageSrc
        ? `\n\t\t<enclosure url="${escapeXml(imageSrc)}" length="${imageSize}" type="${escapeXml(imageMime)}" />`
        : ''
      const contentHtml = imageSrc
        ? `<p><img src="${escapeXml(imageSrc)}" alt="${escapeXml(imageAlt)}" /></p>${post.content || ''}`
        : post.content || ''

      xml += `	<item>
		<title>${escapeXml(post.title)}</title>
		<link>${escapeXml(postUrl)}</link>

		<dc:creator><![CDATA[${globalSettings.clubName}]]></dc:creator>
		<pubDate>${pubDate}</pubDate>
		<guid isPermaLink="true">${escapeXml(postUrl)}</guid>${enclosure}

					<description><![CDATA[${excerpt}]]></description>
										<content:encoded><![CDATA[${contentHtml}]]></content:encoded>



	</item>
`
    }

    xml += `</channel>
</rss>
`

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
