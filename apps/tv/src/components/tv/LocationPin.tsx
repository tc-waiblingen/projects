interface LocationPinProps {
  className?: string
}

/**
 * Location pin icon SVG.
 */
export function LocationPin({ className }: LocationPinProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M12 2c-3.86 0-7 3.14-7 7 0 5.38 6.02 11.26 6.28 11.5.4.37 1.04.37 1.44 0 .26-.24 6.28-6.12 6.28-11.5 0-3.86-3.14-7-7-7zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z"
      />
    </svg>
  )
}
