import { ImageResponse } from 'next/og'
import { OgCard } from '@/components/og/og-card'
import { getOgAssets } from '@/components/og/og-assets'
import { getSiteData } from '@/lib/directus/fetchers'

export const alt = 'TC Waiblingen 1926 e.V.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const [{ globals }, assets] = await Promise.all([getSiteData(), getOgAssets()])

  const siteName = globals.club_name ?? globals.title ?? 'TC Waiblingen 1926 e.V.'
  const title = globals.title ?? 'TC Waiblingen'

  return new ImageResponse(
    (
      <OgCard
        title={title}
        kicker={globals.tagline ?? undefined}
        crestSrc={assets.crestDataUri}
        siteName={siteName}
      />
    ),
    size,
  )
}
