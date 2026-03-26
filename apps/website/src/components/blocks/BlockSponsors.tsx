import Image from "next/image"
import type {
  BlockSponsor as BlockSponsorType,
  DirectusFile,
  Sponsor,
} from "@/types/directus-schema"
import { ContactInfo } from "@/components/elements/contact-info"
import { Section } from "@/components/elements/section"
import { getSiteData } from "@/lib/directus/fetchers"
import { fetchCourtsWithSponsors } from "@/lib/directus/fetchers"
import { getEditAttr } from "@/lib/visual-editing"
import { SitePlanMap } from "./SitePlanMap"
import { SponsorsCards } from "./SponsorsCards"

interface BlockSponsorsProps {
  data: BlockSponsorType
}

export async function BlockSponsors({ data }: BlockSponsorsProps) {
  const { id, headline, tagline, category, style, area_map } = data

  const editAttr = { collection: "block_sponsors", item: String(id) }

  if (style === "site_plan") {
    return (
      <SitePlanView
        headline={headline}
        eyebrow={tagline}
        areaMap={area_map}
        editAttr={editAttr}
      />
    )
  }

  if (style === "table") {
    return (
      <TableView
        headline={headline}
        eyebrow={tagline}
        category={category}
        editAttr={editAttr}
      />
    )
  }

  // Default: cards style
  return (
    <CardsView
      headline={headline}
      eyebrow={tagline}
      category={category}
      editAttr={editAttr}
    />
  )
}

async function CardsView({
  headline,
  eyebrow,
  category,
  editAttr,
}: {
  headline?: string | null
  eyebrow?: string | null
  category?: BlockSponsorType["category"]
  editAttr: { collection: string; item: string }
}) {
  const { sponsors } = await getSiteData()

  // Filter by category if specified
  const filteredSponsors = category
    ? sponsors.filter((s) => s.category === category)
    : sponsors

  if (!filteredSponsors || filteredSponsors.length === 0) {
    return null
  }

  return (
    <Section eyebrow={eyebrow} headline={headline} editAttr={editAttr}>
      <SponsorsCards sponsors={filteredSponsors} />
    </Section>
  )
}

async function TableView({
  headline,
  eyebrow,
  category,
  editAttr,
}: {
  headline?: string | null
  eyebrow?: string | null
  category?: BlockSponsorType["category"]
  editAttr: { collection: string; item: string }
}) {
  const { sponsors } = await getSiteData()

  const filteredSponsors = category
    ? sponsors.filter((s) => s.category === category)
    : sponsors

  if (!filteredSponsors || filteredSponsors.length === 0) {
    return null
  }

  return (
    <Section eyebrow={eyebrow} headline={headline} editAttr={editAttr}>
      <SponsorsTable sponsors={filteredSponsors} />
    </Section>
  )
}

async function SitePlanView({
  headline,
  eyebrow,
  areaMap,
  editAttr,
}: {
  headline?: string | null
  eyebrow?: string | null
  areaMap?: DirectusFile | string | null
  editAttr: { collection: string; item: string }
}) {
  const courts = await fetchCourtsWithSponsors()

  // Build a map of court name -> sponsors
  const courtSponsorsMap = new Map<string, Sponsor[]>()
  for (const court of courts) {
    if (court.name && court.sponsors && Array.isArray(court.sponsors)) {
      const sponsors = court.sponsors
        .map((cs) => {
          if (typeof cs === "string") return null
          if (cs.sponsors_id && typeof cs.sponsors_id !== "string") {
            return cs.sponsors_id as Sponsor
          }
          return null
        })
        .filter((s): s is Sponsor => s !== null)

      if (sponsors.length > 0) {
        courtSponsorsMap.set(court.name, sponsors)
      }
    }
  }

  // Get area map ID
  const areaMapId = typeof areaMap === "string" ? areaMap : areaMap?.id

  return (
    <Section eyebrow={eyebrow} headline={headline} editAttr={editAttr}>
      {areaMapId && (
        <SitePlanMap
          areaMapId={areaMapId}
          courtSponsorsMap={Object.fromEntries(courtSponsorsMap)}
        />
      )}
    </Section>
  )
}

function SponsorsTable({ sponsors }: { sponsors: Sponsor[] }) {
  return (
    <div className="mx-auto max-w-3xl">
      {sponsors.map((sponsor) => (
        <SponsorRow key={sponsor.id} sponsor={sponsor} />
      ))}
    </div>
  )
}

function SponsorRow({ sponsor }: { sponsor: Sponsor }) {
  const logo = sponsor.logo_web as DirectusFile | null
  const hasLogo = logo && typeof logo !== "string"

  // Build address string
  const addressParts: string[] = []
  if (sponsor.address_line1) addressParts.push(sponsor.address_line1)
  if (sponsor.address_line2) addressParts.push(sponsor.address_line2)
  const cityParts: string[] = []
  if (sponsor.address_zip_code) cityParts.push(sponsor.address_zip_code)
  if (sponsor.address_city) cityParts.push(sponsor.address_city)
  if (cityParts.length > 0) addressParts.push(cityParts.join(" "))
  const addressString = addressParts.join(", ")

  // Collect contact items for the footer
  const contactItems: React.ReactNode[] = []
  if (addressString) {
    contactItems.push(<span key="address">{addressString}</span>)
  }
  const contactFields = [
    { type: "phone" as const, value: sponsor.phone },
    { type: "email" as const, value: sponsor.email },
    { type: "website" as const, value: sponsor.website },
    { type: "instagram" as const, value: sponsor.instagram },
    { type: "facebook" as const, value: sponsor.facebook },
  ]
  for (const { type, value } of contactFields) {
    if (value) {
      contactItems.push(
        <ContactInfo
          key={type}
          type={type}
          value={value}
          name={sponsor.name}
          className="text-tcw-red-600 hover:text-tcw-red-700 hover:underline dark:text-tcw-red-400"
        />,
      )
    }
  }

  const logoImage = hasLogo ? (
    <Image
      src={`/api/images/${logo.id}`}
      alt={sponsor.name}
      width={logo.width ?? 180}
      height={logo.height ?? 72}
      className="h-[72px] w-auto max-w-[180px] rounded object-contain"
      unoptimized
    />
  ) : (
    <div className="h-[72px] w-[180px] rounded bg-tcw-accent-100 dark:bg-tcw-accent-800" />
  )

  return (
    <div
      className="py-3 first:pt-0 last:pb-0"
      data-directus={getEditAttr({ collection: "sponsors", item: String(sponsor.id), fields: ["name", "description", "logo_web", "address_line1", "address_line2", "address_zip_code", "address_city", "phone", "email", "website", "instagram", "facebook"], mode: "modal" })}
    >
      <div className="flex flex-col gap-3 rounded-xl bg-white p-8 sm:flex-row sm:gap-7 dark:bg-tcw-accent-900">
        <div className="shrink-0">
          {hasLogo && sponsor.website ? (
            <a
              href={sponsor.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="cursor-pointer"
            >
              {logoImage}
            </a>
          ) : (
            logoImage
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-lg text-body">{sponsor.name}</p>
          {sponsor.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {sponsor.description}
            </p>
          )}
          {contactItems.length > 0 && (
            <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              {contactItems.map((item, i) => (
                <span key={i} className="inline-flex items-center gap-x-3">
                  {i > 0 && (
                    <span aria-hidden="true" className="text-tcw-accent-300 dark:text-tcw-accent-600">
                      ·
                    </span>
                  )}
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
