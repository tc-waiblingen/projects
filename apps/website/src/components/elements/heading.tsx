import { clsx } from 'clsx/lite'
import type { ComponentProps, ElementType } from 'react'

export function Heading({
  as = 'h1',
  children,
  color = 'dark/light',
  className = 'max-w-5xl',
  ...props
}: { as?: 'h1' | 'h2' | 'h3' | 'h4'; color?: 'dark/light' | 'light' } & ComponentProps<'h1'>) {
  const Tag: ElementType = as

  return (
    <Tag
      className={clsx(
        'text-balance',
        color === 'light' && 'text-white dark:text-white',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}
