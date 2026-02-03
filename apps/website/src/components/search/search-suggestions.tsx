'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getPagefind, type Pagefind, type PagefindResult } from './pagefind'

/**
 * Cleans Pagefind URLs to match Next.js routing.
 * Removes .html suffix since Next.js uses clean URLs.
 */
function cleanUrl(url: string): string {
  return url.replace(/\.html$/, '')
}

/**
 * Converts a URL path to a search query.
 *
 * Example:
 * "/news/2024/tennis-turnier-ergebnisse"
 * -> ["news", "2024", "tennis-turnier-ergebnisse"]
 * -> ["news", "2024", "tennis", "turnier", "ergebnisse"]
 * -> "news 2024 tennis turnier ergebnisse"
 */
function pathToSearchQuery(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .flatMap((segment) => segment.split(/[-_.]/).filter(Boolean))
    .join(' ')
}

export function SearchSuggestions() {
  const pathname = usePathname()
  const [results, setResults] = useState<PagefindResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const pagefindRef = useRef<Pagefind | null>(null)

  useEffect(() => {
    async function searchFromPath() {
      const searchQuery = pathToSearchQuery(pathname)

      if (!searchQuery) {
        setIsLoading(false)
        return
      }

      try {
        // Initialize Pagefind if not already loaded
        if (!pagefindRef.current) {
          pagefindRef.current = await getPagefind()
        }

        if (!pagefindRef.current) {
          setIsLoading(false)
          return
        }

        // Perform search
        const search = await pagefindRef.current.search(searchQuery)
        if (search?.results) {
          const resultData = await Promise.all(
            search.results.slice(0, 5).map((r) => r.data())
          )
          setResults(resultData)
        }
      } catch (error) {
        console.error('Failed to search:', error)
      } finally {
        setIsLoading(false)
      }
    }

    searchFromPath()
  }, [pathname])

  // Don't render anything while loading or if no results
  if (isLoading || results.length === 0) {
    return null
  }

  return (
    <div className="mt-16 w-full max-w-2xl text-left">
      <h2 className="mb-4 text-center text-lg font-medium text-body">
        Mögliche Alternativen
      </h2>
      <ul className="space-y-2">
        {results.map((result, index) => (
          <li key={result.url || index}>
            <a
              href={cleanUrl(result.url)}
              className="block rounded-lg border border-tcw-accent-400 px-4 py-3 transition-colors hover:border-tcw-accent-500 hover:bg-tcw-accent-50 dark:border-tcw-accent-500 dark:hover:border-tcw-accent-400 dark:hover:bg-tcw-accent-800"
            >
              <span className="font-medium text-tcw-accent-900 dark:text-white">
                {result.meta.title || 'Ohne Titel'}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
