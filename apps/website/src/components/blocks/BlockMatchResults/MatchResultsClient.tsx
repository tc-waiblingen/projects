'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import type { CalendarEvent, MatchEventMetadata } from '@tcw/calendar'
import { MatchResultCard } from './MatchResultCard'
import { RSSButton } from './RSSButton'

interface MatchResultsClientProps {
  results: CalendarEvent[]
  groupNames: string[]
}

function parseHashState(): string | null {
  if (typeof window === 'undefined') return null

  const hash = window.location.hash.slice(1)
  if (!hash) return null

  const params = new URLSearchParams(hash)
  return params.get('group')
}

function buildHashString(group: string | null): string {
  if (!group) return ''

  const params = new URLSearchParams()
  params.set('group', group)
  return `#${params.toString()}`
}

function getInitialGroup(): string | null {
  if (typeof window === 'undefined') return null
  return parseHashState()
}

export function MatchResultsClient({ results, groupNames }: MatchResultsClientProps) {
  const [group, setGroup] = useState<string | null>(getInitialGroup)
  const isInitialMount = useRef(true)
  const isHashUpdate = useRef(false)

  // Mark initial mount as complete
  useEffect(() => {
    isInitialMount.current = false
  }, [])

  // Update hash on state change (skip initial render)
  useEffect(() => {
    if (isInitialMount.current || isHashUpdate.current) {
      isHashUpdate.current = false
      return
    }

    const hashString = buildHashString(group)
    const newUrl = window.location.pathname + window.location.search + hashString
    window.history.replaceState(null, '', newUrl)
  }, [group])

  // Listen for popstate to handle browser navigation
  useEffect(() => {
    const handlePopState = () => {
      isHashUpdate.current = true
      setGroup(parseHashState())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const filteredResults = useMemo(() => {
    if (!group) return results

    return results.filter((match) => {
      const metadata = match.metadata as MatchEventMetadata
      return metadata.league === group
    })
  }, [results, group])

  return (
    <>
      <div className="mb-6 flex items-center justify-center gap-2">
        {groupNames.length > 0 && (
          <div className="inline-flex rounded-full bg-taupe-200 p-0.5 dark:bg-taupe-700">
            <select
              value={group ?? ''}
              onChange={(e) => setGroup(e.target.value || null)}
              className="cursor-pointer appearance-none rounded-full bg-transparent px-2.5 py-1 pr-7 text-xs font-medium text-taupe-700 transition-colors hover:text-taupe-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-taupe-200 dark:hover:text-white"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23787264' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 0.4rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1rem 1rem',
              }}
            >
              <option value="">Alle Mannschaften</option>
              {groupNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
        <RSSButton group={group} />
      </div>

      {filteredResults.length === 0 ? (
        <p className="text-center text-tcw-accent-900 dark:text-white">
          Keine Ergebnisse für die gewählte Mannschaft vorhanden.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResults.map((match) => (
            <MatchResultCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </>
  )
}
