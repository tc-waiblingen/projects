'use client'

import { useEffect } from 'react'

export default function Error({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
    const timeout = setTimeout(() => {
      window.location.reload()
    }, 30000)
    return () => clearTimeout(timeout)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="tv-message max-w-3xl text-taupe-600">
        Hier gibt es leider ein Problem. Wir versuchen es gleich nochmal.
      </p>
    </div>
  )
}
