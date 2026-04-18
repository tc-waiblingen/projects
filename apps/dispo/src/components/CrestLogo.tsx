import clsx from 'clsx'

export function CrestLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/assets/logo/tcw-crest.svg"
      alt="TC Waiblingen"
      className={clsx('h-12 w-auto', className)}
    />
  )
}
