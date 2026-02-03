import { getEditAttr } from '@/lib/visual-editing'
import { DirectusFile, Navigation, NavigationItem, Page, Post } from '@/types/directus-schema'
import { NavDropdown } from './nav-dropdown'
import { NavLink } from './nav-link'

type NavItemsVariant = 'links' | 'actions'

function getHref(item: NavigationItem): string | null {
  switch (item.type) {
    case 'page':
      if (!item.page) return null
      return (item.page as Page).permalink
    case 'post': {
      if (!item.post) return null
      const post = item.post as Post
      if (!post.slug || !post.published_at) return null
      const year = new Date(post.published_at).getFullYear()
      return `/news/${year}/${post.slug}/`
    }
    case 'url':
      if (!item.url) return null
      return item.url as string
    case 'file': {
      if (!item.file) return null
      const file = item.file as DirectusFile
      return `/api/files/${file.id}`
    }
    default:
      return null
  }
}

function isActiveLink(href: string, currentPath: string): boolean {
  if (href === '/') {
    return currentPath === '/'
  }
  return currentPath === href || currentPath.startsWith(href + '/')
}

function hasActiveChild(item: NavigationItem, currentPath: string): boolean {
  const children = item.children as NavigationItem[] | undefined
  if (!children || children.length === 0) return false

  return children.some((child) => {
    const href = getHref(child)
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

      const href = getHref(item)
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
