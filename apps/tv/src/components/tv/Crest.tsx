import clsx from 'clsx'

interface CrestProps {
  className?: string
}

/**
 * TCW club crest/logo.
 */
export function Crest({ className = '' }: CrestProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/assets/tv/logo/tcw-logo-anniversary-light.svg"
      alt="TCW-Wappen"
      title="Tennis-Club Waiblingen e.V."
      className={clsx('h-full w-auto', className)}
    />
  )
}
