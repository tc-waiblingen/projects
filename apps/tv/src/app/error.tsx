'use client'

import { useEffect } from 'react'
import { Button, ButtonLink } from '@/components/elements/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-24 text-center">
      <h1>Etwas ist schiefgelaufen</h1>
      <p className="mt-4 max-w-md text-taupe-600 dark:text-taupe-300">
        Beim Laden dieser Seite ist ein Fehler aufgetreten.
      </p>
      <div className="mt-8 flex gap-4">
        <Button size="lg" onClick={() => reset()}>
          Erneut versuchen
        </Button>
        <ButtonLink size="lg" color="light" href="/">
          Zur Startseite
        </ButtonLink>
      </div>
    </div>
  )
}
