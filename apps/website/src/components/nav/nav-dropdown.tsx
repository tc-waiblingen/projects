'use client'

import { ElPopover } from '@tailwindplus/elements/react'
import { clsx } from 'clsx/lite'
import Link from 'next/link'
import { type ComponentProps, useEffect, useId, useRef, useState } from 'react'
import { ChevronDownIcon } from '../icons/chevron-down-icon'
import { DirectusFile, NavigationItem, Page, Post } from '@/types/directus-schema'

type NavDropdownVariant = 'default' | 'primary'

// Check if browser supports CSS Anchor Positioning
const supportsAnchorPositioning =
  typeof CSS !== 'undefined' && CSS.supports('anchor-name', '--test')

function getChildHref(item: NavigationItem): string | null {
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

export function NavDropdown({
  item,
  variant = 'default',
  isActive,
  anchor = 'left',
  className,
  'data-directus': dataDirectus,
  ...props
}: {
  item: NavigationItem
  variant?: NavDropdownVariant
  isActive?: boolean
  anchor?: 'left' | 'right'
  'data-directus'?: string
} & Omit<ComponentProps<'div'>, 'children'>) {
  const autoId = useId()
  const id = `nav-dropdown-${autoId.replace(/:/g, '')}`
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Sync aria-expanded with popover state via native toggle event
  // Also position popover manually for browsers without CSS Anchor Positioning
  useEffect(() => {
    const popover = document.getElementById(id)
    if (!popover) return

    const handleToggle = (event: ToggleEvent) => {
      setIsOpen(event.newState === 'open')

      // Position popover manually for browsers without CSS Anchor Positioning
      if (event.newState === 'open' && !supportsAnchorPositioning && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        popover.style.top = `${rect.bottom}px`
        if (anchor === 'left') {
          popover.style.left = `${rect.left}px`
        } else {
          popover.style.left = `${rect.right}px`
          popover.style.transform = 'translateX(-100%)'
        }
      }
    }

    popover.addEventListener('toggle', handleToggle)
    return () => popover.removeEventListener('toggle', handleToggle)
  }, [id, anchor])

  const children = (item.children as NavigationItem[]) || []

  const showPopover = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    const popover = document.getElementById(id)
    if (popover && !popover.matches(':popover-open')) {
      popover.showPopover()
    }
  }

  const hidePopoverDelayed = () => {
    timeoutRef.current = setTimeout(() => {
      const popover = document.getElementById(id)
      if (popover && popover.matches(':popover-open')) {
        popover.hidePopover()
      }
    }, 150)
  }

  const cancelHide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const anchorName = `--anchor-${id}`

  return (
    <div
      className={clsx('relative', className)}
      data-directus={dataDirectus}
      onMouseEnter={showPopover}
      onMouseLeave={hidePopoverDelayed}
      {...props}
    >
      <button
        ref={buttonRef}
        type="button"
        command="toggle-popover"
        commandfor={id}
        aria-expanded={isOpen}
        style={{ anchorName } as React.CSSProperties}
        className={clsx(
          'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full px-3 py-1 text-sm/7 font-medium',
          variant === 'default' && 'text-tcw-accent-900 dark:text-white',
          variant === 'default' && isActive && 'bg-tcw-accent-900/10 dark:bg-white/10',
          variant === 'default' && !isActive && 'hover:bg-tcw-accent-900/10 dark:hover:bg-white/10',
          variant === 'primary' &&
            'bg-tcw-red-600 text-white hover:bg-tcw-red-500 dark:bg-tcw-red-200 dark:text-tcw-red-900 dark:hover:bg-tcw-red-100',
        )}
      >
        {item.title}
        <ChevronDownIcon className="size-2.5 transition-transform duration-200 in-aria-expanded:rotate-180" />
      </button>
      <ElPopover
        id={id}
        ref={popoverRef}
        popover="auto"
        onMouseEnter={cancelHide}
        onMouseLeave={hidePopoverDelayed}
        style={
          anchor === 'left'
            ? ({ positionAnchor: anchorName, top: 'anchor(bottom)', left: 'anchor(left)' } as React.CSSProperties)
            : ({ positionAnchor: anchorName, top: 'anchor(bottom)', left: 'anchor(right)' } as React.CSSProperties)
        }
        className={clsx(
          'absolute m-0 mt-2 min-w-48 rounded-lg bg-white p-2 shadow-lg ring-1 ring-tcw-accent-900/10 dark:bg-tcw-accent-800 dark:ring-white/10',
          anchor === 'right' && '-translate-x-full',
        )}
      >
        <div className="flex flex-col">
          {children.map((child) => {
            if (child.type === 'divider') {
              return (
                <div
                  key={child.id}
                  className="mt-2 mb-1 flex items-center gap-2 px-3"
                >
                  <hr className="flex-1 border-t border-tcw-accent-900/10 dark:border-white/10" />
                  {child.title && (
                    <>
                      <span className="text-xs font-semibold text-tcw-accent-900 dark:text-white">
                        {child.title}
                      </span>
                      <hr className="flex-1 border-t border-tcw-accent-900/10 dark:border-white/10" />
                    </>
                  )}
                </div>
              )
            }
            const href = getChildHref(child)
            if (!href) return null
            return (
              <Link
                key={child.id}
                href={href}
                className="rounded-md px-3 py-2 text-sm/6 text-tcw-accent-900 hover:bg-tcw-accent-100 dark:text-white dark:hover:bg-tcw-accent-700"
              >
                {child.title}
              </Link>
            )
          })}
        </div>
      </ElPopover>
    </div>
  )
}
