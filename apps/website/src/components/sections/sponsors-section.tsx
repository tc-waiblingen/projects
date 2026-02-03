"use client"

import Image from 'next/image'
import type { DirectusFile, Sponsor } from '@/types/directus-schema'
import { SponsorDialogTrigger } from '@/components/elements/sponsor-dialog'
import { getEditAttr } from '@/lib/visual-editing'

interface SponsorsSectionProps {
  sponsors: Sponsor[]
}

function SponsorCard({ sponsor, size = 'lg' }: { sponsor: Sponsor; size?: 'lg' | 'sm' }) {
  const logo = sponsor.logo_web as DirectusFile | null
  const hasLogo = logo && typeof logo !== 'string'

  const sizeClasses = size === 'lg' ? 'max-h-20' : 'max-h-12'
  const title = sponsor.description ? `${sponsor.name} – ${sponsor.description}` : sponsor.name

  const content = hasLogo ? (
    <Image
      src={`/api/images/${logo.id}`}
      alt={sponsor.name}
      title={title}
      width={logo.width ?? 390}
      height={logo.height ?? 174}
      className={`h-auto w-auto max-w-full object-contain ${sizeClasses}`}
      unoptimized
    />
  ) : (
    <span
      title={title}
      className={`line-clamp-2 text-center font-semibold text-gray-700 ${size === 'lg' ? 'text-sm' : 'text-xs'}`}
    >
      {sponsor.name}
    </span>
  )

  return (
    <SponsorDialogTrigger sponsor={sponsor}>
      <div
        className={`flex items-center justify-center rounded-lg bg-white ${size === 'lg' ? 'min-h-[5rem] px-2 py-3' : 'min-h-[3rem] px-1.5 py-2'}`}
        data-directus={getEditAttr({ collection: 'sponsors', item: String(sponsor.id), fields: ['name', 'logo_web', 'description'] })}
      >
        {content}
      </div>
    </SponsorDialogTrigger>
  )
}

export function SponsorsSection({ sponsors }: SponsorsSectionProps) {
  if (!sponsors || sponsors.length === 0) {
    return null
  }

  // Group sponsors by category
  const sponsorsByCategory = sponsors.reduce(
    (acc, sponsor) => {
      const category = sponsor.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(sponsor)
      return acc
    },
    {} as Record<Sponsor['category'], Sponsor[]>
  )

  // Order categories: premium_partner first, then trade_partner
  const categoryOrder: Sponsor['category'][] = ['premium_partner', 'trade_partner']

  return (
    <div className="mt-12">
      <p className="mb-4 font-semibold text-muted">
        Diese Partner unterstützen uns und im Gegenzug bitten wir Sie, auch diese zu unterstützen:
      </p>

      <div className="flex flex-col gap-8">
        {categoryOrder.map((category) => {
          const categorySponsors = sponsorsByCategory[category]
          if (!categorySponsors || categorySponsors.length === 0) {
            return null
          }

          const isPremium = category === 'premium_partner'
          const size = isPremium ? 'lg' : 'sm'
          const gridClasses = isPremium
            ? 'grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4'
            : 'grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6'

          return (
            <div key={category}>
              <div className={`grid ${gridClasses}`}>
                {categorySponsors.map((sponsor) => (
                  <SponsorCard key={sponsor.id} sponsor={sponsor} size={size} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
