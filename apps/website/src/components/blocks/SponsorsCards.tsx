import Image from "next/image"
import Link from "next/link"
import type { DirectusFile, Sponsor } from "@/types/directus-schema"

interface SponsorsCardsProps {
  sponsors: Sponsor[]
}

function getSponsorUrl(sponsor: Sponsor): string | null {
  return sponsor.website || sponsor.instagram || sponsor.facebook || null
}

function SponsorCard({
  sponsor,
  size = "lg",
}: {
  sponsor: Sponsor
  size?: "lg" | "sm"
}) {
  const logo = sponsor.logo_web as DirectusFile | null
  const url = getSponsorUrl(sponsor)
  const hasLogo = logo && typeof logo !== "string"

  const sizeClasses = size === "lg" ? "max-h-20" : "max-h-12"
  const title = sponsor.description
    ? `${sponsor.name} – ${sponsor.description}`
    : sponsor.name

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
      className={`line-clamp-2 text-center font-semibold text-gray-700 ${size === "lg" ? "text-sm" : "text-xs"}`}
    >
      {sponsor.name}
    </span>
  )

  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-white ${size === "lg" ? "min-h-[5rem] px-2 py-3" : "min-h-[3rem] px-1.5 py-2"}`}
    >
      {url ? (
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={sponsor.name}
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  )
}

export function SponsorsCards({ sponsors }: SponsorsCardsProps) {
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
    {} as Record<Sponsor["category"], Sponsor[]>,
  )

  // Order categories: premium_partner first, then trade_partner
  const categoryOrder: Sponsor["category"][] = ["premium_partner", "trade_partner"]

  return (
    <div className="flex flex-col gap-8">
      {categoryOrder.map((category) => {
        const categorySponsors = sponsorsByCategory[category]
        if (!categorySponsors || categorySponsors.length === 0) {
          return null
        }

        const isPremium = category === "premium_partner"
        const size = isPremium ? "lg" : "sm"
        const gridClasses = isPremium
          ? "grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
          : "grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6"

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
  )
}
