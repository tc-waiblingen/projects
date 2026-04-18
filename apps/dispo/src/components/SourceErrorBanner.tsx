import { sourceErrorMessage, type BannerVariant, type ExternalSource } from '@/lib/source-error-message'

interface SourceErrorBannerProps {
  source: ExternalSource
  variant?: BannerVariant
}

export function SourceErrorBanner({ source, variant = 'block' }: SourceErrorBannerProps) {
  const copy = sourceErrorMessage(source, variant)

  if (variant === 'inline') {
    return <p className="mb-3 text-sm text-muted">{copy.body}</p>
  }

  return (
    <div
      role="alert"
      className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
    >
      <strong>{copy.title}</strong> {copy.body}
    </div>
  )
}
