import type { BlockPricing as BlockPricingType, BlockPricingCard } from "@/types/directus-schema"
import { Plan, PricingMultiTier } from "@/components/sections/pricing-multi-tier"
import { Eyebrow } from "@/components/elements/eyebrow"
import { SingleButton } from "./ButtonGroup"
import { clsx } from "clsx/lite"
import { getEditAttr } from "@/lib/visual-editing"

interface BlockPricingProps {
  data: BlockPricingType
}

export function BlockPricing({ data }: BlockPricingProps) {
  const { id, headline, tagline, pricing_cards } = data

  const eyebrow = tagline ? (
    <Eyebrow data-directus={getEditAttr({ collection: "block_pricing", item: String(id), fields: "tagline" })}>
      {tagline}
    </Eyebrow>
  ) : undefined

  const plans =
    pricing_cards && pricing_cards.length > 0
      ? pricing_cards.map((card) => {
          if (typeof card === "string") {
            return null
          }
          return <PricingCard key={card.id} data={card} />
        })
      : null

  return (
    <PricingMultiTier
      eyebrow={eyebrow}
      headline={headline ? (
        <span data-directus={getEditAttr({ collection: "block_pricing", item: String(id), fields: "headline" })}>
          {headline}
        </span>
      ) : ""}
      plans={plans}
    />
  )
}

function PricingCard({ data }: { data: BlockPricingCard }) {
  const { title, description, price, badge, features, is_highlighted, button } = data

  const parsedFeatures = parseFeatures(features)
  const subheadline = description ? <p>{description}</p> : <p />

  const cta =
    button && typeof button !== "string" ? (
      <SingleButton data={button} />
    ) : undefined

  return (
    <Plan
      name={title ?? ""}
      price={price ?? ""}
      subheadline={subheadline}
      badge={badge}
      features={parsedFeatures}
      cta={cta}
      className={clsx(
        is_highlighted && "ring-2 ring-tcw-accent-900 dark:ring-white"
      )}
    />
  )
}

function parseFeatures(features: BlockPricingCard["features"]): string[] {
  if (!features) {
    return []
  }

  // features is typed as 'json' | null, but at runtime it's the actual JSON data
  const rawFeatures = features as unknown

  if (Array.isArray(rawFeatures)) {
    return rawFeatures.filter((f): f is string => typeof f === "string")
  }

  if (typeof rawFeatures === "string") {
    try {
      const parsed = JSON.parse(rawFeatures)
      if (Array.isArray(parsed)) {
        return parsed.filter((f): f is string => typeof f === "string")
      }
    } catch {
      return []
    }
  }

  return []
}
