import clsx from 'clsx'

interface CrestProps {
  className?: string
}

/**
 * TCW club crest/logo.
 */
export function Crest({ className = '' }: CrestProps) {
  return (
    <img
      src="/assets/tv/logo/tcw-logo-anniversary-light.svg"
      alt="TCW-Wappen"
      title="Tennis-Club Waiblingen e.V."
      className={clsx(className)}
    />
  )
}
