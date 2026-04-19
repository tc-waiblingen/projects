import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { OgCard } from '@/components/og/og-card'
import { getOgAssets } from '@/components/og/og-assets'
import { getSiteData } from '@/lib/directus/fetchers'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const [{ globals }, assets] = await Promise.all([getSiteData(), getOgAssets()])

  const siteName = globals.club_name ?? globals.title ?? 'TC Waiblingen 1926 e.V.'
  const title = searchParams.get('title') ?? siteName
  const kicker = searchParams.get('kicker') ?? undefined

  return new ImageResponse(
    (
      <OgCard
        title={title}
        kicker={kicker}
        crestSrc={assets.crestDataUri}
        siteName={siteName}
      />
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    },
  )
}
