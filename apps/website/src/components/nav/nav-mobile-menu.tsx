import { Navigation, NavigationItem } from '@/types/directus-schema'
import { NavMobileTreeItem } from './nav-mobile-tree-item'

export function prioritizePrimary(items: NavigationItem[]): NavigationItem[] {
  return [...items].sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary))
}

interface NavMobileMenuProps {
  navMain: Navigation
  navCTA: Navigation
  currentPath?: string
}

export function NavMobileMenu({ navMain, navCTA, currentPath }: NavMobileMenuProps) {
  const items = prioritizePrimary([
    ...((navMain.items as NavigationItem[]) ?? []),
    ...((navCTA.items as NavigationItem[]) ?? []),
  ])

  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <NavMobileTreeItem key={item.id} item={item} currentPath={currentPath} />
      ))}
    </div>
  )
}
