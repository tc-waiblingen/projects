import type { BlockClubOffice as BlockClubOfficeType } from "@/types/directus-schema"
import { Section } from "@/components/elements/section"
import { ClubOfficeInfo } from "@/components/sections/club-office-info"

interface BlockClubOfficeProps {
  data: BlockClubOfficeType
}

export function BlockClubOffice({ data }: BlockClubOfficeProps) {
  const { id, headline, tagline, alignment } = data
  const isCentered = alignment === 'center'

  return (
    <Section
      eyebrow={tagline}
      headline={headline}
      alignment={alignment}
      editAttr={{ collection: 'block_club_office', item: String(id) }}
    >
      <div className={isCentered ? 'flex justify-center' : ''}>
        <ClubOfficeInfo />
      </div>
    </Section>
  )
}
