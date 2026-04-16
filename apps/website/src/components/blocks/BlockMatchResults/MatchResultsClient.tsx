'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import type { CalendarEvent, MatchEventMetadata } from '@tcw/calendar'
import { MatchResultCard } from './MatchResultCard'
import { RSSButton } from './RSSButton'

export interface TeamEntry {
  value: string
  label: string
  seasonSort: number
}

interface MatchResultsClientProps {
  results: CalendarEvent[]
  teamEntries: TeamEntry[]
}

function parseHashState(): string | null {
  if (typeof window === 'undefined') return null

  const hash = window.location.hash.slice(1)
  if (!hash) return null

  const params = new URLSearchParams(hash)
  return params.get('team')
}

function buildHashString(team: string | null): string {
  if (!team) return ''

  const params = new URLSearchParams()
  params.set('team', team)
  return `#${params.toString()}`
}

function getInitialTeam(): string | null {
  if (typeof window === 'undefined') return null
  return parseHashState()
}

export function MatchResultsClient({ results, teamEntries }: MatchResultsClientProps) {
  const [team, setTeam] = useState<string | null>(getInitialTeam)
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

    const hashString = buildHashString(team)
    const newUrl = window.location.pathname + window.location.search + hashString
    window.history.replaceState(null, '', newUrl)
  }, [team])

  // Listen for popstate to handle browser navigation
  useEffect(() => {
    const handlePopState = () => {
      isHashUpdate.current = true
      setTeam(parseHashState())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const filteredResults = useMemo(() => {
    if (!team) return results

    return results.filter((match) => {
      const metadata = match.metadata as MatchEventMetadata
      return metadata.teamId === team
    })
  }, [results, team])

  return (
    <>
      <div className="mb-6 flex items-center justify-center gap-2">
        {teamEntries.length > 0 && (
          <div className="inline-flex rounded-full bg-taupe-200 p-0.5 dark:bg-taupe-700">
            <select
              value={team ?? ''}
              onChange={(e) => setTeam(e.target.value || null)}
              className="cursor-pointer appearance-none rounded-full bg-transparent px-2.5 py-1 pr-7 text-xs font-medium text-taupe-700 transition-colors hover:text-taupe-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-taupe-200 dark:hover:text-white"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23787264' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 0.4rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1rem 1rem',
              }}
            >
              <option value="">Alle Mannschaften</option>
              {teamEntries.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <RSSButton team={team} />
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
