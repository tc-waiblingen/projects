'use client'

import { PopoverButton } from '@headlessui/react'
import { clsx } from 'clsx/lite'
import Link from 'next/link'
import { DirectusFile, NavigationItem, Page, Post } from '@/types/directus-schema'

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

interface NavMobileTreeItemProps {
  item: NavigationItem
  currentPath?: string
  depth?: number
}

export function NavMobileTreeItem({ item, currentPath, depth = 0 }: NavMobileTreeItemProps) {
  const children = item.children as NavigationItem[] | undefined
  const isGroup = item.type === 'group' && children && children.length > 0
  const indent = depth * 0.75

  if (item.type === 'divider') {
    return (
      <div
        className="mt-3 mb-2 flex items-center gap-2"
        style={{ marginLeft: `${indent}rem`, marginRight: '0.75rem' }}
      >
        <hr className="flex-1 border-t border-tcw-accent-200 dark:border-tcw-accent-600" />
        {item.title && (
          <>
            <span className="text-xs font-semibold text-tcw-accent-900 dark:text-white">
              {item.title}
            </span>
            <hr className="flex-1 border-t border-tcw-accent-200 dark:border-tcw-accent-600" />
          </>
        )}
      </div>
    )
  }

  if (isGroup) {
    return (
      <div className={depth === 0 ? 'mt-4 first:mt-0' : 'mt-1'}>
        <span
          className="block px-3 py-2 text-sm font-semibold text-tcw-accent-900 dark:text-white"
          style={{ paddingLeft: `${indent + 0.75}rem` }}
        >
          {item.title}
        </span>
        <div className="flex flex-col">
          {children.map((child) => (
            <NavMobileTreeItem key={child.id} item={child} currentPath={currentPath} depth={depth + 1} />
          ))}
        </div>
      </div>
    )
  }

  const href = getHref(item)
  if (!href) return null

  const isActive = currentPath ? isActiveLink(href, currentPath) : false

  return (
    <PopoverButton
      as={Link}
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={clsx(
        'block w-full rounded-lg px-3 py-2 text-base text-tcw-accent-700 transition-colors hover:bg-tcw-accent-100 dark:text-tcw-accent-200 dark:hover:bg-tcw-accent-700',
        isActive && 'bg-tcw-accent-100 font-medium text-tcw-accent-900 dark:bg-tcw-accent-700 dark:text-white',
      )}
      style={{ marginLeft: `${indent}rem` }}
    >
      {item.title}
    </PopoverButton>
  )
}
