import { clsx } from 'clsx/lite'
import type { PreviewReason } from '@/lib/visibility'

interface PreviewBadgeProps {
  reason: PreviewReason
  className?: string
}

function formatScheduledDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PreviewBadge({ reason, className }: PreviewBadgeProps) {
  let label: string
  let variant: 'draft' | 'in_review' | 'scheduled'

  switch (reason.type) {
    case 'draft':
      label = 'Entwurf'
      variant = 'draft'
      break
    case 'in_review':
      label = 'In Prüfung'
      variant = 'in_review'
      break
    case 'scheduled':
      label = `Wird veröffentlicht am ${formatScheduledDate(reason.publishAt)}`
      variant = 'scheduled'
      break
  }

  return (
    <div
      className={clsx(
        'fixed right-4 top-20 z-50 max-w-sm rounded-lg px-4 py-2 text-sm font-medium shadow-lg',
        variant === 'draft' && 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
        variant === 'in_review' && 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
        variant === 'scheduled' && 'bg-tcw-red-100 text-tcw-red-900 dark:bg-tcw-red-900 dark:text-tcw-red-100',
        className,
      )}
    >
      {label}
    </div>
  )
}
