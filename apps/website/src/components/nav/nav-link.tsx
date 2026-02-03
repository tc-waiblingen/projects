import { clsx } from 'clsx/lite'
import Link from 'next/link'
import type { ComponentProps } from 'react'

type NavLinkVariant = 'default' | 'primary'

export function NavLink({
  children,
  href,
  variant = 'default',
  isActive,
  className,
  'data-directus': dataDirectus,
  ...props
}: {
  href: string
  variant?: NavLinkVariant
  isActive?: boolean
  'data-directus'?: string
} & Omit<ComponentProps<'a'>, 'href'>) {
  return (
    <Link
      href={href}
      data-directus={dataDirectus}
      aria-current={isActive ? 'page' : undefined}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full px-3 py-1 text-sm/7 font-medium',
        variant === 'default' && 'text-tcw-accent-900 dark:text-white',
        variant === 'default' && isActive && 'bg-tcw-accent-900/10 dark:bg-white/10',
        variant === 'default' && !isActive && 'hover:bg-tcw-accent-900/10 dark:hover:bg-white/10',
        variant === 'primary' &&
          'bg-tcw-red-600 text-white hover:bg-tcw-red-500 dark:bg-tcw-red-200 dark:text-tcw-red-900 dark:hover:bg-tcw-red-100',
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  )
}
