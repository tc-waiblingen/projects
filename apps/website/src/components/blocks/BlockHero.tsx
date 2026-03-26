import type { BlockHero as BlockHeroType } from "@/types/directus-schema"
import { HeroTwoColumnWithPhoto } from "@/components/sections/hero-two-column-with-photo"
import { HeroLeftAlignedWithPhoto } from "@/components/sections/hero-left-aligned-with-photo"
import { AnnouncementBadge } from '@/components/elements/announcement-badge'
import { ButtonGroup } from "./ButtonGroup"
import { GetLinkHref } from "@/lib/dynamic-link-helper"
import { HeroImage } from "./HeroImage"
import { getEditAttr } from "@/lib/visual-editing"

interface BlockHeroProps {
  data: BlockHeroType
}

export function BlockHero({ data }: BlockHeroProps) {
  const { id, tagline, headline, description, image, button_group, layout } = data
  const tagline_button_data = {
    type: data.tagline_button_type, url: data.tagline_button_url,
    page: data.tagline_button_page, post: data.tagline_button_post, label: data.tagline_button_label,
    file: data.tagline_button_file
  }

  const eyebrow = tagline ? (
    <span data-directus={getEditAttr({ collection: "block_hero", item: String(id), fields: "tagline" })}>
      <AnnouncementBadge href={GetLinkHref(tagline_button_data) || ""} text={tagline} cta={tagline_button_data.label} />
    </span>
  ) : undefined
  const subheadline = description ? (
    <p data-directus={getEditAttr({ collection: "block_hero", item: String(id), fields: "description" })}>
      {description}
    </p>
  ) : undefined
  const cta = button_group && typeof button_group !== "string" ? (
    <div data-directus={getEditAttr({ collection: "block_hero", item: String(id), fields: "button_group" })}>
      <ButtonGroup data={button_group} />
    </div>
  ) : undefined
  const photo = image && typeof image !== "string" ? (
    <div data-directus={getEditAttr({ collection: "block_hero", item: String(id), fields: "image" })}>
      <HeroImage file={image} />
    </div>
  ) : undefined

  const headlineElement = (
    <span data-directus={getEditAttr({ collection: "block_hero", item: String(id), fields: "headline" })}>
      {headline ?? ""}
    </span>
  )

  if (layout === "image_left") {
    return (
      <HeroTwoColumnWithPhoto
        eyebrow={eyebrow}
        headline={headlineElement}
        subheadline={subheadline}
        cta={cta}
        photo={photo}
        photoSide="left"
      />
    )
  }

  if (layout === "image_center") {
    return (
      <HeroLeftAlignedWithPhoto
        eyebrow={eyebrow}
        headline={headlineElement}
        subheadline={subheadline}
        cta={cta}
        photo={photo}
      />
    )
  }

  // Default: image_right
  return (
    <HeroTwoColumnWithPhoto
      eyebrow={eyebrow}
      headline={headlineElement}
      subheadline={subheadline}
      cta={cta}
      photo={photo}
    />
  )
}
