import type { BlockButtonGroup, BlockButton } from "@/types/directus-schema"
import {
  ButtonLink,
  SoftButtonLink,
  PlainButtonLink,
} from "@/components/elements/button"
import { ArrowNarrowRightIcon } from "@/components/icons/arrow-narrow-right-icon"
import { GetLinkHref } from "@/lib/dynamic-link-helper"

interface ButtonGroupProps {
  data: BlockButtonGroup
  currentPath?: string
}

function isActiveLink(href: string, currentPath: string): boolean {
  if (href === '/') {
    return currentPath === '/'
  }
  return currentPath === href || currentPath.startsWith(href + '/')
}

export function ButtonGroup({ data, currentPath }: ButtonGroupProps) {
  const { buttons } = data

  if (!buttons || buttons.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {buttons.map((button) => {
        if (typeof button === "string") {
          return null
        }
        const href = GetLinkHref({
          type: button.type,
          url: button.url,
          page: button.page,
          post: button.post,
          file: button.file,
        })
        const isActive = href && currentPath ? isActiveLink(href, currentPath) : false
        return <SingleButton key={button.id} data={button} href={href} isActive={isActive} />
      })}
    </div>
  )
}

interface SingleButtonProps {
  data: BlockButton
  href?: string | null
  isActive?: boolean
}

export function SingleButton({ data, href: providedHref, isActive }: SingleButtonProps) {
  const { label, variant, type, url, page, post, file } = data

  const href = providedHref ?? GetLinkHref({ type, url, page, post, file })

  if (!href || !label) {
    return null
  }

  switch (variant) {
    case "outline":
    case "soft":
      return (
        <SoftButtonLink href={href} size="lg" isActive={isActive}>
          {label}
        </SoftButtonLink>
      )
    case "ghost":
    case "link":
      return (
        <PlainButtonLink href={href} size="lg" isActive={isActive}>
          {label} <ArrowNarrowRightIcon />
        </PlainButtonLink>
      )
    case "default":
    default:
      return (
        <ButtonLink href={href} size="lg" isActive={isActive}>
          {label}
        </ButtonLink>
      )
  }
}
