import { clsx } from 'clsx/lite'
import type { ComponentProps } from 'react'

export function PhoneIcon({ className, ...props }: ComponentProps<'svg'>) {
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
      <path
        d="M1.5 2.5C1.5 1.94772 1.94772 1.5 2.5 1.5H4.5L5.5 4L4 5C4.5 6.5 6.5 8.5 8 9L9 7.5L12 8.5V10.5C12 11.0523 11.5523 11.5 11 11.5C5.75329 11.5 1.5 7.24671 1.5 2.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
