import {
  FooterCategory,
  FooterLink,
} from '@/components/sections/footer-with-newsletter-form-categories-and-social-icons'
import { Navigation, NavigationItem } from '@/types/directus-schema'
import { getNavItemHref } from '@/lib/dynamic-link-helper'
import { getEditAttr } from '@/lib/visual-editing'

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
                const href = getNavItemHref(child)
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

        const href = getNavItemHref(item)
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
