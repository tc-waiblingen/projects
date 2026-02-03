import type { ReactNode } from 'react'

interface FlashMessageProps {
  children: ReactNode
}

/**
 * Flash message overlay for seasonal greetings.
 */
export function FlashMessage({ children }: FlashMessageProps) {
  return (
    <div className="absolute left-1/2 top-full mt-28 w-[80vw] max-w-[55ch] -translate-x-1/2 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white shadow-lg backdrop-blur-md">
      <p className="text-center font-serif tv-message leading-normal">{children}</p>
    </div>
  )
}
