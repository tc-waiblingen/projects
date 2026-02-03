import { clsx } from 'clsx/lite'
import type { ComponentProps } from 'react'

export function ChevronDownIcon({ className, ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      width={10}
      height={6}
      viewBox="0 0 10 6"
      fill="currentColor"
      role="image"
      className={clsx('inline-block', className)}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M.22.22a.75.75 0 011.06 0L5 3.94 8.72.22a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L.22 1.28a.75.75 0 010-1.06z"
      />
    </svg>
  )
}
