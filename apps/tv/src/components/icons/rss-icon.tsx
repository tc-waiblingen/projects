import { clsx } from 'clsx/lite'
import type { ComponentProps } from 'react'

export function RSSIcon({ className, ...props }: ComponentProps<'svg'>) {
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
      <circle cx="2.5" cy="10.5" r="1.5" fill="currentColor" />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M1 7a5 5 0 0 1 5 5M1 3.5a8.5 8.5 0 0 1 8.5 8.5"
      />
    </svg>
  )
}
