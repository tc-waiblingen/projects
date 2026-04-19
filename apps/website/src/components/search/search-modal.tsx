'use client'

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { clsx } from 'clsx/lite'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlassIcon } from '@/components/icons/magnifying-glass-icon'
import { getPagefind, type Pagefind, type PagefindResult } from './pagefind'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Cleans Pagefind URLs to match Next.js routing.
 * Removes .html suffix since Next.js uses clean URLs.
 */
function cleanUrl(url: string): string {
  return url.replace(/\.html$/, '')
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PagefindResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLUListElement>(null)
  const pagefindRef = useRef<Pagefind | null>(null)

  // Initialize Pagefind
  useEffect(() => {
    async function initPagefind() {
      if (pagefindRef.current) return
      pagefindRef.current = await getPagefind()
    }
    if (isOpen) {
      initPagefind()
    }
  }, [isOpen])

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(-1)
    }
  }, [isOpen])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [results])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
      selectedElement?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!pagefindRef.current || !searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const search = await pagefindRef.current.search(searchQuery)
      const resultData = await Promise.all(
        search.results.slice(0, 8).map((r) => r.data())
      )
      setResults(resultData)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  // Navigate to selected result
  const navigateToResult = useCallback((url: string) => {
    onClose()
    router.push(url)
  }, [onClose, router])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          navigateToResult(cleanUrl(results[selectedIndex].url))
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [results, selectedIndex, navigateToResult, onClose])

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      initialFocus={inputRef}
      className="relative z-50"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-tcw-accent-900/50 backdrop-blur-sm transition-opacity duration-200 ease-out data-[closed]:opacity-0 dark:bg-black/70"
      />

      <div className="fixed inset-0 overflow-y-auto p-4 sm:pt-[min(8vh,6rem)]">
        <DialogPanel
          transition
          className="mx-auto mt-[10vh] max-w-xl transform overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-tcw-accent-900/10 transition-all duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 sm:mt-0 dark:bg-tcw-accent-800 dark:ring-white/10"
          onKeyDown={handleKeyDown}
        >
          <DialogTitle className="sr-only">Suche</DialogTitle>

          {/* Search Input */}
          <div className="relative flex items-center border-b border-tcw-accent-200 dark:border-tcw-accent-700">
            <MagnifyingGlassIcon className="pointer-events-none ml-4 h-5 w-5 text-tcw-accent-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen..."
              className="h-14 w-full border-0 bg-transparent pl-3 pr-4 text-tcw-accent-900 placeholder-tcw-accent-500 focus:outline-none focus:ring-0 dark:text-white dark:placeholder-tcw-accent-400"
            />
            <kbd className="mr-4 hidden rounded bg-tcw-accent-100 px-2 py-1 text-xs font-medium text-tcw-accent-600 sm:inline-block dark:bg-tcw-accent-700 dark:text-tcw-accent-300">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {isLoading && (
              <div className="px-4 py-8 text-center text-tcw-accent-500">
                Suche...
              </div>
            )}

            {!isLoading && query && results.length === 0 && (
              <div className="px-4 py-8 text-center text-tcw-accent-500">
                Keine Ergebnisse für &quot;{query}&quot;
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <ul ref={resultsRef} role="listbox">
                {results.map((result, index) => (
                  <li key={result.url || index} role="option" aria-selected={index === selectedIndex}>
                    <a
                      href={cleanUrl(result.url)}
                      onClick={(e) => {
                        e.preventDefault()
                        navigateToResult(cleanUrl(result.url))
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={clsx(
                        'block rounded-lg px-4 py-3 transition-colors',
                        index === selectedIndex
                          ? 'bg-tcw-accent-100 dark:bg-tcw-accent-700'
                          : 'hover:bg-tcw-accent-100 dark:hover:bg-tcw-accent-700'
                      )}
                    >
                      <div className="font-medium text-tcw-accent-900 dark:text-white">
                        {result.meta.title || 'Ohne Titel'}
                      </div>
                      {/* Pagefind excerpt; wraps query matches in <mark> tags — Pagefind escapes user input before indexing. */}
                      <div
                        className="mt-1 line-clamp-2 text-sm text-tcw-accent-600 dark:text-tcw-accent-300"
                        dangerouslySetInnerHTML={{ __html: result.excerpt }}
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {!query && (
              <div className="px-4 py-8 text-center text-tcw-accent-500">
                Suchbegriff eingeben...
              </div>
            )}
          </div>

          {/* Keyboard hints footer */}
          {results.length > 0 && (
            <div className="flex items-center justify-end gap-4 border-t border-tcw-accent-200 px-4 py-2 text-xs text-tcw-accent-500 dark:border-tcw-accent-700">
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-tcw-accent-100 px-1.5 py-0.5 font-medium dark:bg-tcw-accent-700">↑</kbd>
                <kbd className="rounded bg-tcw-accent-100 px-1.5 py-0.5 font-medium dark:bg-tcw-accent-700">↓</kbd>
                <span className="ml-1">navigieren</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-tcw-accent-100 px-1.5 py-0.5 font-medium dark:bg-tcw-accent-700">↵</kbd>
                <span className="ml-1">öffnen</span>
              </span>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
