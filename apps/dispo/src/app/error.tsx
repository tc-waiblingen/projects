'use client'

import { useEffect } from 'react'

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
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold text-body">Etwas ist schiefgelaufen</h1>
      <p className="mt-3 text-sm text-muted">
        Beim Laden dieser Seite ist ein Fehler aufgetreten.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 cursor-pointer rounded-md border border-tcw-accent-300 px-4 py-2 text-sm font-medium text-body hover:text-tcw-red-700 dark:border-tcw-accent-700"
      >
        Erneut versuchen
      </button>
    </main>
  )
}
