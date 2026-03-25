import { clsx } from 'clsx/lite'
import type { ComponentProps } from 'react'

export function Document({ children, className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={clsx(
        // ' text-tcw-accent-900 dark:text-tcw-accent-100 [&_p]:mb-7 [&_a]:font-semibold [&_a]:text-tcw-accent-900 [&_a]:underline [&_a]:underline-offset-4 dark:[&_a]:text-white [&_h1]:not-first:mt-7 [&_h2]:not-first:mt-7 [&_h3]:not-first:mt-7 [&_h1]:mb-3 [&_h2]:mb-3 [&_h3]:mb-3 [&_li]:pl-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:font-semibold [&_strong]:text-tcw-accent-900 dark:[&_strong]:text-white [&_ul]:list-[square] [&_ul]:pl-6 [&_ul]:marker:text-tcw-accent-200 dark:[&_ul]:marker:text-tcw-accent-600 [&_td:not(:has(h1,h2,h3,h4))]:align-top [&_th:not(:has(h1,h2,h3,h4))]:align-top [&_td:has(h1,h2,h3,h4)]:align-bottom [&_th:has(h1,h2,h3,h4)]:align-bottom [&_table_h1]:mb-0 [&_table_h1]:mt-3 [&_table_h2]:mb-0 [&_table_h2]:mt-3 [&_table_h3]:mb-0 [&_table_h3]:mt-3 [&_table_h4]:mb-0 [&_table_h4]:mt-3',
        ' text-body [&_p]:mb-7 [&_a]:font-semibold [&_a]:text-tcw-accent-900 [&_a]:underline [&_a]:underline-offset-4 dark:[&_a]:text-white [&_h1]:not-first:mt-7 [&_h2]:not-first:mt-7 [&_h3]:not-first:mt-7 [&_h1]:mb-3 [&_h2]:mb-3 [&_h3]:mb-3 [&_li]:pl-2 [&_ol]:mb-7 [&_ol]:list-decimal [&_ol]:pl-10 [&_strong]:font-semibold [&_strong]:text-tcw-accent-900 dark:[&_strong]:text-white [&_ul]:mb-7 [&_ul]:list-[square] [&_ul]:pl-10 [&_ul]:marker:text-tcw-accent-700 dark:[&_ul]:marker:text-tcw-accent-300 [&_ol]:marker:text-tcw-accent-700 dark:[&_ol]:marker:text-tcw-accent-300 [&_table_h1]:mb-0 [&_table_h1]:mt-3 [&_table_h2]:mt-3 [&_table_h3]:mt-3 [&_table_h4]:mt-3 [&_blockquote]:mb-7 [&_blockquote]:not-first:mt-7 [&_blockquote]:border-l-3 [&_blockquote]:border-tcw-accent-700 dark:[&_blockquote]:border-tcw-accent-600 [&_blockquote]:bg-tcw-accent-50 dark:[&_blockquote]:bg-taupe-800/50 [&_blockquote]:rounded-r-md [&_blockquote]:py-5 [&_blockquote]:px-6 [&_blockquote_p]:text-muted [&_blockquote_p:last-child]:mb-0',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
