import { clsx } from 'clsx/lite'
import Link from 'next/link'
import type { ComponentProps } from 'react'

const sizes = {
  md: 'px-3 py-1',
  lg: 'px-4 py-2',
}

export function Button({
  size = 'md',
  type = 'button',
  color = 'dark/light',
  className,
  disabled,
  ...props
}: {
  size?: keyof typeof sizes
  color?: 'dark/light' | 'light'
} & ComponentProps<'button'>) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-1 rounded-full text-sm/7 font-medium',
        disabled
          ? 'cursor-not-allowed bg-tcw-accent-900/30 text-white dark:bg-tcw-accent-300/30 dark:text-tcw-accent-900'
          : 'cursor-pointer',
        !disabled && color === 'dark/light' &&
        'bg-tcw-accent-900 text-white hover:bg-tcw-accent-800 dark:bg-tcw-accent-300 dark:text-tcw-accent-900 dark:hover:bg-tcw-accent-200',
        !disabled && color === 'light' && 'hover bg-white text-tcw-accent-900 hover:bg-tcw-accent-100 dark:bg-tcw-accent-100 dark:hover:bg-white',
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}

export function ButtonLink({
  size = 'md',
  color = 'dark/light',
  className,
  href,
  isActive,
  disabled,
  ...props
}: {
  href: string
  size?: keyof typeof sizes
  color?: 'dark/light' | 'light' | 'primary+dark/light'
  isActive?: boolean
  disabled?: boolean
} & Omit<ComponentProps<'a'>, 'href'>) {
  const classes = clsx(
    'inline-flex shrink-0 items-center justify-center gap-1 rounded-full text-sm/7 font-medium',
    disabled
      ? 'cursor-not-allowed bg-tcw-accent-900/30 text-white dark:bg-tcw-accent-300/30 dark:text-tcw-accent-900'
      : 'cursor-pointer',
    !disabled && color === 'dark/light' &&
    'bg-tcw-accent-900 text-white hover:bg-tcw-accent-800 dark:bg-tcw-accent-300 dark:text-tcw-accent-900 dark:hover:bg-tcw-accent-200',
    !disabled && color === 'primary+dark/light' &&
    'bg-tcw-red-600 text-white hover:bg-tcw-red-500 dark:bg-tcw-red-200 dark:text-tcw-red-900 dark:hover:bg-tcw-red-100',
    !disabled && color === 'light' && 'hover bg-white text-tcw-accent-900 hover:bg-tcw-accent-100 dark:bg-tcw-accent-100 dark:hover:bg-white',
    isActive && 'ring-2 ring-offset-2 ring-tcw-accent-900 dark:ring-tcw-accent-300 dark:ring-offset-tcw-accent-900',
    sizes[size],
    className,
  )

  if (disabled) {
    return <span aria-disabled="true" className={classes} {...props} />
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={classes}
      {...props}
    />
  )
}

export function SoftButton({
  size = 'md',
  type = 'button',
  className,
  disabled,
  ...props
}: {
  size?: keyof typeof sizes
} & ComponentProps<'button'>) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-1 rounded-full text-sm/7 font-medium',
        disabled
          ? 'cursor-not-allowed bg-tcw-accent-900/5 text-tcw-accent-600 dark:bg-white/5 dark:text-tcw-accent-300'
          : 'cursor-pointer bg-tcw-accent-900/10 text-tcw-accent-900 hover:bg-tcw-accent-900/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/20',
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}

export function SoftButtonLink({
  size = 'md',
  href,
  className,
  isActive,
  disabled,
  ...props
}: {
  href: string
  size?: keyof typeof sizes
  isActive?: boolean
  disabled?: boolean
} & Omit<ComponentProps<'a'>, 'href'>) {
  const classes = clsx(
    'inline-flex shrink-0 items-center justify-center gap-1 rounded-full text-sm/7 font-medium',
    disabled
      ? 'cursor-not-allowed bg-tcw-accent-900/5 text-tcw-accent-600 dark:bg-white/5 dark:text-tcw-accent-300'
      : 'cursor-pointer text-tcw-accent-900 dark:text-white',
    !disabled && isActive && 'bg-tcw-accent-900/20 dark:bg-white/25',
    !disabled && !isActive && 'bg-tcw-accent-900/10 hover:bg-tcw-accent-900/15 dark:bg-white/10 dark:hover:bg-white/20',
    sizes[size],
    className,
  )

  if (disabled) {
    return <span aria-disabled="true" className={classes} {...props} />
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={classes}
      {...props}
    />
  )
}

export function PlainButton({
  size = 'md',
  color = 'dark/light',
  type = 'button',
  className,
  disabled,
  ...props
}: {
  size?: keyof typeof sizes
  color?: 'dark/light' | 'light'
} & ComponentProps<'button'>) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm/7 font-medium',
        disabled
          ? 'cursor-not-allowed text-tcw-accent-600 dark:text-tcw-accent-300'
          : 'cursor-pointer',
        !disabled && color === 'dark/light' && 'text-tcw-accent-900 hover:bg-tcw-accent-900/10 dark:text-white dark:hover:bg-white/10',
        !disabled && color === 'light' && 'text-white hover:bg-white/15 dark:hover:bg-white/10',
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}

export function PlainButtonLink({
  size = 'md',
  color = 'dark/light',
  href,
  className,
  isActive,
  disabled,
  ...props
}: {
  href: string
  size?: keyof typeof sizes
  color?: 'dark/light' | 'light'
  isActive?: boolean
  disabled?: boolean
} & Omit<ComponentProps<'a'>, 'href'>) {
  const classes = clsx(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm/7 font-medium',
    disabled
      ? 'cursor-not-allowed text-tcw-accent-600 dark:text-tcw-accent-300'
      : 'cursor-pointer',
    !disabled && color === 'dark/light' && 'text-tcw-accent-900 dark:text-white',
    !disabled && color === 'light' && 'text-white',
    !disabled && !isActive && color === 'dark/light' && 'hover:bg-tcw-accent-900/10 dark:hover:bg-white/10',
    !disabled && !isActive && color === 'light' && 'hover:bg-white/15 dark:hover:bg-white/10',
    !disabled && isActive && 'bg-tcw-accent-900/10 dark:bg-white/15',
    sizes[size],
    className,
  )

  if (disabled) {
    return <span aria-disabled="true" className={classes} {...props} />
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={classes}
      {...props}
    />
  )
}
