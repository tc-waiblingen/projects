import type {
  BlockNavMenu as BlockNavMenuType,
  Navigation,
  NavigationItem,
} from "@/types/directus-schema"
import { clsx } from "clsx/lite"
import { Section } from "@/components/elements/section"
import { ButtonLink, SoftButtonLink } from "@/components/elements/button"
import { GetLinkHref } from "@/lib/dynamic-link-helper"

interface BlockNavMenuProps {
  data: BlockNavMenuType
  currentPath?: string
}

function isActiveLink(href: string, currentPath: string): boolean {
  if (href === '/') {
    return currentPath === '/'
  }
  return currentPath === href || currentPath.startsWith(href + '/')
}

export function BlockNavMenu({ data, currentPath }: BlockNavMenuProps) {
  const { id, nav, tagline, headline, alignment } = data

  if (!nav || typeof nav === "string") {
    return null
  }

  const navigation = nav as Navigation
  const items = navigation.items

  if (!items || items.length === 0) {
    return null
  }

  return (
    <Section eyebrow={tagline} headline={headline} alignment={alignment} editAttr={{ collection: "block_nav_menu", item: String(id) }}>
      <div className={clsx("flex flex-wrap items-center gap-4", alignment === 'center' && "justify-center")}>
        {items.map((item) => {
          if (typeof item === "string") {
            return null
          }
          return (
            <NavMenuItem
              key={item.id}
              item={item}
              currentPath={currentPath}
            />
          )
        })}
      </div>
    </Section>
  )
}

interface NavMenuItemProps {
  item: NavigationItem
  currentPath?: string
}

function NavMenuItem({ item, currentPath }: NavMenuItemProps) {
  const { title, type, is_primary, url, page, post, file } = item

  // Skip group and divider items as they are not direct links
  if (type === "group" || type === "divider") {
    return null
  }

  const href = GetLinkHref({ type, url, page, post, file })

  if (!href) {
    return null
  }

  const isActive = currentPath ? isActiveLink(href, currentPath) : false

  if (is_primary) {
    return (
      <ButtonLink href={href} size="lg" isActive={isActive}>
        {title}
      </ButtonLink>
    )
  }

  return (
    <SoftButtonLink href={href} size="lg" isActive={isActive}>
      {title}
    </SoftButtonLink>
  )
}
