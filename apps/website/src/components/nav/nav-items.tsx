import { getEditAttr } from '@/lib/visual-editing'
import { getNavItemHref, isActiveLink } from '@/lib/dynamic-link-helper'
import { Navigation, NavigationItem } from '@/types/directus-schema'
import { NavDropdown } from './nav-dropdown'
import { NavLink } from './nav-link'

type NavItemsVariant = 'links' | 'actions'

function hasActiveChild(item: NavigationItem, currentPath: string): boolean {
  const children = item.children as NavigationItem[] | undefined
  if (!children || children.length === 0) return false

  return children.some((child) => {
    const href = getNavItemHref(child)
    return href ? isActiveLink(href, currentPath) : false
  })
}

function isGroupWithChildren(item: NavigationItem): boolean {
  return item.type === 'group' && Array.isArray(item.children) && item.children.length > 0
}

export function NavItems({
  navigation,
  variant = 'links',
  currentPath,
}: {
  navigation: Navigation
  variant?: NavItemsVariant
  currentPath?: string
}) {
  const navItems = navigation.items as NavigationItem[]

  const items = navItems
    ?.map((item: NavigationItem) => {
      // Handle group items with children
      if (isGroupWithChildren(item)) {
        if (variant === 'actions') {
          return (
            <NavDropdown
              key={item.id}
              item={item}
              variant={item.is_primary ? 'primary' : 'default'}
              anchor="right"
              className={item.primary_on_mobile ? undefined : 'max-lg:hidden'}
              data-directus={getEditAttr({
                collection: 'navigation_items',
                item: String(item.id),
                fields: 'title,type,is_primary,primary_on_mobile,page,post,url,file',
              })}
            />
          )
        }

        // Links variant - desktop only
        const isActive = currentPath ? hasActiveChild(item, currentPath) : false
        return (
          <NavDropdown
            key={item.id}
            item={item}
            variant={item.is_primary ? 'primary' : 'default'}
            isActive={isActive}
            className="max-lg:hidden"
            data-directus={getEditAttr({
              collection: 'navigation_items',
              item: String(item.id),
              fields: 'title,type,is_primary,primary_on_mobile,page,post,url,file',
            })}
          />
        )
      }

      const href = getNavItemHref(item)
      if (!href) return null

      const isActive = currentPath ? isActiveLink(href, currentPath) : false

      if (variant === 'links') {
        return (
          <NavLink
            key={item.id}
            href={href}
            variant={item.is_primary ? 'primary' : 'default'}
            isActive={isActive}
            data-directus={getEditAttr({
              collection: 'navigation_items',
              item: String(item.id),
              fields: 'title,type,is_primary,primary_on_mobile,page,post,url,file',
            })}
          >
            {item.title}
          </NavLink>
        )
      }

      // variant === 'actions'
      return (
        <NavLink
          key={item.id}
          href={href}
          variant={item.is_primary ? 'primary' : 'default'}
          className={item.primary_on_mobile ? undefined : 'max-lg:hidden'}
          data-directus={getEditAttr({
            collection: 'navigation_items',
            item: String(item.id),
            fields: 'title,type,is_primary,primary_on_mobile,page,post,url,file',
          })}
        >
          {item.title}
        </NavLink>
      )
    })
    .filter((item): item is React.ReactElement => item !== null)

  return <>{items}</>
}
