import { clsx } from 'clsx/lite'
import type { ComponentProps } from 'react'

export function Main({ children, className, ...props }: ComponentProps<'main'>) {
  return (
    <main data-pagefind-body className={clsx('isolate overflow-clip', className)} {...props}>
      {children}
    </main>
  )
}
