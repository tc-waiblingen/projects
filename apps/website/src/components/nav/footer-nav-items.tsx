import {
  FooterCategory,
  FooterLink,
} from '@/components/sections/footer-with-newsletter-form-categories-and-social-icons'
import { DirectusFile, Navigation, NavigationItem, Page, Post } from '@/types/directus-schema'
import { getEditAttr } from '@/lib/visual-editing'

function getHref(item: NavigationItem): string | null {
  switch (item.type) {
    case 'page':
      if (!item.page) return null
      return (item.page as Page).permalink
    case 'post':
      if (!item.post) return null
      return `/news/${(item.post as Post).slug}/`
    case 'url':
      if (!item.url) return null
      return item.url as string
    case 'file': {
      if (!item.file) return null
      const file = item.file as DirectusFile
      return `/api/files/${file.id}`
    }
    case 'group':
      return null
    default:
      return null
  }
}

export function FooterNavItems({ navigation }: { navigation: Navigation }) {
  const navItems = navigation.items as NavigationItem[]

  return (
    <>
      {navItems?.map((item: NavigationItem) => {
        if (item.type === 'group') {
          const children = item.children as NavigationItem[] | undefined
          return (
            <FooterCategory
              key={item.id}
              title={item.title}
              titleDataDirectus={getEditAttr({ collection: 'navigation_items', item: item.id, fields: 'title' })}
            >
              {children?.map((child: NavigationItem) => {
                const href = getHref(child)
                if (!href) return null
                return (
                  <FooterLink
                    key={child.id}
                    href={href}
                    contentDataDirectus={getEditAttr({ collection: 'navigation_items', item: child.id, fields: 'title' })}
                  >
                    {child.title}
                  </FooterLink>
                )
              })}
            </FooterCategory>
          )
        }

        const href = getHref(item)
        if (!href) return null

        return (
          <FooterLink
            key={item.id}
            href={href}
            contentDataDirectus={getEditAttr({ collection: 'navigation_items', item: item.id, fields: 'title' })}
          >
            {item.title}
          </FooterLink>
        )
      })}
    </>
  )
}
