'use client'

import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

const SearchModal = lazy(() =>
  import('./search-modal').then((mod) => ({ default: mod.SearchModal }))
)

export function SearchProvider() {
  const [isOpen, setIsOpen] = useState(false)

  const openSearch = useCallback(() => setIsOpen(true), [])
  const closeSearch = useCallback(() => setIsOpen(false), [])

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        openSearch()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [openSearch])

  return (
    <Suspense fallback={null}>
      {isOpen && <SearchModal isOpen={isOpen} onClose={closeSearch} />}
    </Suspense>
  )
}
