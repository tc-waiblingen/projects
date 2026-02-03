import clsx from 'clsx'
import Image from 'next/image'

interface CrestProps {
  className?: string
}

/**
 * TCW club crest/logo.
 */
export function Crest({ className = '' }: CrestProps) {
  return (
    <Image
      src="/assets/tv/logo/tcw-logo-anniversary-light.svg"
      alt="TCW-Wappen"
      title="Tennis-Club Waiblingen e.V."
      width={200}
      height={200}
      className={clsx(className)}
    />
  )
}
