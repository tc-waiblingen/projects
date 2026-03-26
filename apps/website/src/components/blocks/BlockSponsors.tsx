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
    <div className="mx-auto max-w-2xl overflow-x-auto">
      <table className="min-w-full">
        <tbody className="divide-y divide-tcw-accent-100 dark:divide-tcw-accent-800">
          {sponsors.map((sponsor) => (
            <SponsorTableRow key={sponsor.id} sponsor={sponsor} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SponsorTableRow({ sponsor }: { sponsor: Sponsor }) {
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

  return (
    <tr>
      <td className="w-52 px-4 py-3 align-top">
        {hasLogo ? (
          <SponsorTableLogo
            logo={logo}
            name={sponsor.name}
            url={sponsor.website}
          />
        ) : (
          <div className="h-16 w-32 rounded bg-tcw-accent-100 dark:bg-tcw-accent-800" />
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <p className="font-semibold text-tcw-accent-900 dark:text-white">
          {sponsor.name}
        </p>
        <div className="mt-0.5 text-sm text-muted">
          {sponsor.description && <p>{sponsor.description}</p>}
          {(addressString || sponsor.phone || sponsor.email || sponsor.website || sponsor.instagram || sponsor.facebook) && (
            <div className={sponsor.description ? "mt-2" : undefined}>
              {addressString && <p>{addressString}</p>}
              {sponsor.phone && (
                <p>
                  <ContactInfo
                    type="phone"
                    value={sponsor.phone}
                    name={sponsor.name}
                    className="text-tcw-red-600 hover:text-tcw-red-700 hover:underline dark:text-tcw-red-400"
                  />
                </p>
              )}
              {sponsor.email && (
                <p>
                  <ContactInfo
                    type="email"
                    value={sponsor.email}
                    name={sponsor.name}
                    className="text-tcw-red-600 hover:text-tcw-red-700 hover:underline dark:text-tcw-red-400"
                  />
                </p>
              )}
              {sponsor.website && (
                <p>
                  <ContactInfo
                    type="website"
                    value={sponsor.website}
                    name={sponsor.name}
                    className="text-tcw-red-600 hover:text-tcw-red-700 hover:underline dark:text-tcw-red-400"
                  />
                </p>
              )}
              {sponsor.instagram && (
                <p>
                  <ContactInfo
                    type="instagram"
                    value={sponsor.instagram}
                    name={sponsor.name}
                    className="text-tcw-red-600 hover:text-tcw-red-700 hover:underline dark:text-tcw-red-400"
                  />
                </p>
              )}
              {sponsor.facebook && (
                <p>
                  <ContactInfo
                    type="facebook"
                    value={sponsor.facebook}
                    name={sponsor.name}
                    className="text-tcw-red-600 hover:text-tcw-red-700 hover:underline dark:text-tcw-red-400"
                  />
                </p>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function SponsorTableLogo({
  logo,
  name,
  url,
}: {
  logo: DirectusFile
  name: string
  url?: string | null
}) {
  const image = (
    <Image
      src={`/api/images/${logo.id}`}
      alt={name}
      width={logo.width ?? 180}
      height={logo.height ?? 64}
      className="h-16 w-auto max-w-[180px] object-contain"
      unoptimized
    />
  )

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="cursor-pointer"
      >
        {image}
      </a>
    )
  }

  return image
}
