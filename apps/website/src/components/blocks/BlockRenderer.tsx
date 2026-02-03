import { clsx } from "clsx/lite"
import type {
  PageBlock,
  BlockHero as BlockHeroType,
  BlockRichtext as BlockRichtextType,
  BlockForm as BlockFormType,
  BlockPost as BlockPostType,
  BlockGallery as BlockGalleryType,
  BlockPricing as BlockPricingType,
  BlockAttachment as BlockAttachmentType,
  BlockTeam as BlockTeamType,
  BlockTrainer as BlockTrainerType,
  BlockClubCalendar as BlockClubCalendarType,
  BlockMatchResult as BlockMatchResultType,
  BlockInstagram as BlockInstagramType,
  BlockIframe as BlockIframeType,
  BlockSponsor as BlockSponsorType,
  BlockButtonGroup as BlockButtonGroupType,
  BlockNavMenu as BlockNavMenuType,
} from "@/types/directus-schema"
import { BlockHero } from "./BlockHero"
import { BlockRichtext } from "./BlockRichtext"
import { BlockPricing } from "./BlockPricing"
import { BlockGallery } from "./BlockGallery"
import { BlockPosts } from "./BlockPosts"
import { BlockForm } from "./BlockForm"
import { BlockAttachments } from "./BlockAttachments"
import { BlockTeam } from "./BlockTeam"
import { BlockTrainers } from "./BlockTrainers"
import { BlockClubCalendar } from "./BlockClubCalendar"
import { BlockMatchResults } from "./BlockMatchResults"
import { BlockInstagram } from "./BlockInstagram"
import { BlockIframe } from "./BlockIframe"
import { BlockSponsors } from "./BlockSponsors"
import { BlockButtonGroupBlock } from "./BlockButtonGroupBlock"
import { BlockNavMenu } from "./BlockNavMenu"

interface BlockRendererProps {
  blocks: PageBlock[]
  currentPath?: string
}

export function BlockRenderer({ blocks, currentPath }: BlockRendererProps) {
  return (
    <>
      {blocks.map((block) => (
        <BlockWrapper key={block.id} background={block.background}>
          <Block block={block} currentPath={currentPath} />
        </BlockWrapper>
      ))}
    </>
  )
}

function BlockWrapper({
  background,
  children,
}: {
  background?: "default" | "light" | "dark" | null
  children: React.ReactNode
}) {
  if (!background) {
    return <>{children}</>
  }

  return (
    <div
      className={clsx(
        background === "default" && "",
        background === "dark" && "bg-tcw-accent-950 text-white",
        background === "light" && "bg-tcw-accent-50 dark:bg-tcw-accent-900",
      )}
    >
      {children}
    </div>
  )
}

function Block({ block, currentPath }: { block: PageBlock; currentPath?: string }) {
  const { collection, item } = block

  if (!item || typeof item === "string") {
    return null
  }

  switch (collection) {
    case "block_hero":
      return <BlockHero data={item as BlockHeroType} />
    case "block_richtext":
      return <BlockRichtext data={item as BlockRichtextType} />
    case "block_form":
      return <BlockForm data={item as BlockFormType} />
    case "block_posts":
      return <BlockPosts data={item as BlockPostType} />
    case "block_gallery":
      return <BlockGallery data={item as BlockGalleryType} />
    case "block_pricing":
      return <BlockPricing data={item as BlockPricingType} />
    case "block_attachments":
      return <BlockAttachments data={item as BlockAttachmentType} />
    case "block_team":
      return <BlockTeam data={item as BlockTeamType} />
    case "block_trainers":
      return <BlockTrainers data={item as BlockTrainerType} />
    case "block_club_calendar":
      return <BlockClubCalendar data={item as BlockClubCalendarType} />
    case "block_match_results":
      return <BlockMatchResults data={item as BlockMatchResultType} />
    case "block_instagram":
      return <BlockInstagram data={item as BlockInstagramType} />
    case "block_iframe":
      return <BlockIframe data={item as BlockIframeType} />
    case "block_sponsors":
      return <BlockSponsors data={item as BlockSponsorType} />
    case "block_button_group":
      return <BlockButtonGroupBlock data={item as BlockButtonGroupType} currentPath={currentPath} />
    case "block_nav_menu":
      return <BlockNavMenu data={item as BlockNavMenuType} currentPath={currentPath} />
    default:
      return <PlaceholderBlock name={collection ?? "Unknown"} />
  }
}

function PlaceholderBlock({ name }: { name: string }) {
  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="rounded-lg border-2 border-dashed border-tcw-accent-300 p-8 text-center dark:border-tcw-accent-700">
          <p className="text-tcw-accent-500 dark:text-tcw-accent-400">
            Block: {name} (not yet implemented)
          </p>
        </div>
      </div>
    </div>
  )
}
