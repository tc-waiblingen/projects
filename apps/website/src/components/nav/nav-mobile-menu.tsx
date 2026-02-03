import { Navigation, NavigationItem } from '@/types/directus-schema'
import { NavMobileTreeItem } from './nav-mobile-tree-item'

interface NavMobileMenuProps {
  navMain: Navigation
  navCTA: Navigation
  currentPath?: string
}

export function NavMobileMenu({ navMain, navCTA, currentPath }: NavMobileMenuProps) {
  const mainItems = navMain.items as NavigationItem[]
  const ctaItems = navCTA.items as NavigationItem[]

  return (
    <div className="flex flex-col">
      {mainItems?.map((item) => (
        <NavMobileTreeItem key={item.id} item={item} currentPath={currentPath} />
      ))}
      {ctaItems && ctaItems.length > 0 && (
        <>
          <hr className="my-2 border-tcw-accent-200 dark:border-tcw-accent-700" />
          {ctaItems.map((item) => (
            <NavMobileTreeItem key={item.id} item={item} currentPath={currentPath} />
          ))}
        </>
      )}
    </div>
  )
}
