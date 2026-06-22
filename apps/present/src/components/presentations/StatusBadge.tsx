import type { PresentationStatus } from '@/lib/presentations'
import clsx from 'clsx'

const LABEL: Record<PresentationStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  live: 'Live',
  ended: 'Ended',
}

export function StatusBadge({ status }: { status: PresentationStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-bold',
        status === 'live' && 'bg-green-100 text-green-800',
        status === 'ready' && 'bg-cyan-100 text-cyan-800',
        status === 'draft' && 'bg-tcw-accent-100 text-tcw-accent-800',
        status === 'ended' && 'bg-taupe-200 text-muted',
      )}
    >
      {LABEL[status]}
    </span>
  )
}
