import { clsx } from 'clsx/lite'
import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { ChevronIcon } from '../icons/chevron-icon'

export function AnnouncementBadge({
  text,
  href,
  cta = 'Mehr Infos',
  variant = 'normal',
  className,
  ...props
}: {
  text: ReactNode
  href: string
  cta?: ReactNode
  variant?: 'normal' | 'overlay'
} & Omit<ComponentProps<'a'>, 'href' | 'children'>) {
  return (
    <Link
      href={href}
      {...props}
      data-variant={variant}
      className={clsx(
        'group interactive-group relative inline-flex max-w-full gap-x-3 overflow-hidden rounded-md px-3.5 py-2 text-sm/6 font-medium max-sm:flex-col sm:items-center sm:rounded-full sm:px-4 sm:py-1',
        variant === 'normal' &&
        'animate-glow-pulse bg-gradient-to-r from-tcw-red-500 to-tcw-red-400 text-white shadow-lg shadow-tcw-red-500/25 transition-shadow hover:shadow-xl hover:shadow-tcw-red-500/40',
        variant === 'overlay' &&
        'animate-glow-pulse bg-gradient-to-r from-tcw-red-600 to-tcw-red-500 text-white shadow-lg shadow-tcw-red-600/30 transition-shadow hover:shadow-xl hover:shadow-tcw-red-600/50',
        className,
      )}
    >
      <span className="text-pretty sm:truncate">{text}</span>
      <span className="h-3 w-px bg-white/30 max-sm:hidden" />
      <span className="inline-flex shrink-0 items-center gap-2 font-semibold">
        <span className="decoration-white/0 underline-offset-2 transition-all duration-200 group-hover:decoration-white/70 group-active:decoration-white/70 group-focus-visible:decoration-white/70">{cta}</span>
        <ChevronIcon className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-active:translate-x-0.5 group-focus-visible:translate-x-0.5" />
      </span>
    </Link>
  )
}
