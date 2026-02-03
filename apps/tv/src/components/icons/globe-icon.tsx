import { clsx } from 'clsx/lite'
import type { ComponentProps } from 'react'

export function GlobeIcon({ className, ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 13 13"
      fill="none"
      strokeWidth={1}
      role="image"
      className={clsx('inline-block', className)}
      {...props}
    >
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" />
      <ellipse cx="6.5" cy="6.5" rx="2.5" ry="5.5" stroke="currentColor" />
      <path d="M1.5 4.5H11.5" stroke="currentColor" />
      <path d="M1.5 8.5H11.5" stroke="currentColor" />
    </svg>
  )
}
