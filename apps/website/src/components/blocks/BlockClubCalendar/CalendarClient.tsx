'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { CalendarEvent, ClubEventMetadata, MatchEventMetadata } from '@tcw/calendar'
import { FilterControls, type CategoryFilter, type TeamEntry } from './FilterControls'
import { EventList } from './EventList'
import { useTocSafe } from '@/components/toc'

interface FilterState {
  futureOnly: boolean
  category: CategoryFilter
  team: string | null
}

const DEFAULT_STATE: FilterState = {
  futureOnly: true,
  category: 'all',
  team: null,
}

const KNOWN_FILTER_KEYS = ['future', 'category', 'team']

/** Migrate legacy hash params (#future=0&category=matches) to query params */
function migrateHashParams(): void {
  if (typeof window === 'undefined') return
  const hash = window.location.hash.slice(1)
  if (!hash) return

  const hashParams = new URLSearchParams(hash)
  const keysToMigrate = KNOWN_FILTER_KEYS.filter((key) => hashParams.has(key))
  if (keysToMigrate.length === 0) return

  const searchParams = new URLSearchParams(window.location.search)
  for (const key of keysToMigrate) {
    if (!searchParams.has(key)) {
      searchParams.set(key, hashParams.get(key)!)
    }
    hashParams.delete(key)
  }

  const queryString = searchParams.toString()
  const remainingHash = hashParams.toString()
  window.history.replaceState(
    null,
    '',
    window.location.pathname +
      (queryString ? `?${queryString}` : '') +
      (remainingHash ? `#${remainingHash}` : ''),
  )
}

function parseQueryState(): Partial<FilterState> {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  if (params.size === 0) return {}

  const state: Partial<FilterState> = {}

  const futureParam = params.get('future')
  if (futureParam === '0') {
    state.futureOnly = false
  }

  const categoryParam = params.get('category')
  if (categoryParam && ['matches', 'tournaments', 'club', 'beginners', 'children'].includes(categoryParam)) {
    state.category = categoryParam as CategoryFilter
  }

  const teamParam = params.get('team')
  if (teamParam) {
    state.team = teamParam
  }

  return state
}

function buildQueryString(state: FilterState, isLocked = false): string {
  const params = new URLSearchParams()

  if (!state.futureOnly) {
    params.set('future', '0')
  }

  if (!isLocked && state.category !== 'all') {
    params.set('category', state.category)
  }

  if (state.team) {
    params.set('team', state.team)
  }

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

interface CalendarClientProps {
  events: CalendarEvent[]
  teamEntries: TeamEntry[]
  serverNow: number
  filterCategory?: CategoryFilter
  style?: 'default' | 'list'
  alignment?: 'left' | 'center'
}

export function CalendarClient({ events, teamEntries, serverNow, filterCategory, style = 'default', alignment = 'left' }: CalendarClientProps) {
  const isLocked = !!filterCategory && filterCategory !== 'all'
  const [state, setState] = useState<FilterState>({
    ...DEFAULT_STATE,
    ...(isLocked ? { category: filterCategory } : {}),
  })
  const [isHydrated, setIsHydrated] = useState(false)
  const isHashUpdate = useRef(false)
  const { refresh } = useTocSafe()

  // Use server timestamp to avoid hydration mismatch
  const now = useMemo(() => new Date(serverNow), [serverNow])

  // Apply query state after hydration to avoid mismatch
  // This subscribes to the URL search params as an external data source
  useEffect(() => {
    if (style === 'list') {
      const rafId = requestAnimationFrame(() => setIsHydrated(true))
      return () => cancelAnimationFrame(rafId)
    }
    migrateHashParams()
    const queryState = parseQueryState()
    if (isLocked) {
      delete queryState.category
    }
    const applyState = () => {
      if (Object.keys(queryState).length > 0) {
        setState((prev) => ({ ...prev, ...queryState }))
      }
      setIsHydrated(true)
    }
    // Use requestAnimationFrame to avoid synchronous setState warning
    const rafId = requestAnimationFrame(applyState)
    return () => cancelAnimationFrame(rafId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update query params on state change (skip until hydrated)
  useEffect(() => {
    if (style === 'list') return
    if (!isHydrated || isHashUpdate.current) {
      isHashUpdate.current = false
      return
    }

    const queryString = buildQueryString(state, isLocked)
    const newUrl = window.location.pathname + queryString + window.location.hash
    window.history.replaceState(null, '', newUrl)
  }, [state, isHydrated, style, isLocked])

  // Listen for popstate to handle browser navigation
  useEffect(() => {
    if (style === 'list') return

    const handlePopState = () => {
      isHashUpdate.current = true
      const queryState = parseQueryState()
      if (isLocked) {
        delete queryState.category
      }
      setState({ ...DEFAULT_STATE, ...queryState, ...(isLocked ? { category: filterCategory } : {}) })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [style, isLocked, filterCategory])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Future only filter - include all events from today regardless of time
      if (state.futureOnly) {
        const startOfToday = new Date(now)
        startOfToday.setHours(0, 0, 0, 0)
        if (event.startDate < startOfToday) {
          return false
        }
      }

      // Category filter
      if (state.category !== 'all') {
        if (state.category === 'matches' && event.source !== 'match') {
          return false
        }
        if (state.category === 'tournaments' && event.source !== 'tournament') {
          return false
        }
        if (state.category === 'club' && event.source !== 'club' && event.source !== 'app') {
          return false
        }
        // beginners filter - only club events with category === 'beginners'
        if (state.category === 'beginners') {
          if (event.source !== 'club') {
            return false
          }
          const metadata = event.metadata as ClubEventMetadata
          if (metadata.category !== 'beginners') {
            return false
          }
        }
        // children filter - only club events with category === 'children'
        if (state.category === 'children') {
          if (event.source !== 'club') {
            return false
          }
          const metadata = event.metadata as ClubEventMetadata
          if (metadata.category !== 'children') {
            return false
          }
        }
      }

      // Team filter (only applies to match events)
      if (state.team) {
        if (event.source !== 'match') {
          return false
        }
        const metadata = event.metadata as MatchEventMetadata
        if (metadata.teamId !== state.team) {
          return false
        }
      }

      return true
    })
  }, [events, state, now])

  // Refresh TOC when filtered events change (month headers may appear/disappear)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refresh()
    }, 50)
    return () => clearTimeout(timeoutId)
  }, [filteredEvents, refresh])

  return (
    <>
      {!isLocked && (
        <FilterControls
          futureOnly={state.futureOnly}
          onFutureOnlyChange={(value) => setState((prev) => ({ ...prev, futureOnly: value }))}
          category={state.category}
          onCategoryChange={(value) => setState((prev) => ({ ...prev, category: value }))}
          team={state.team}
          onTeamChange={(value) =>
            setState((prev) => ({ ...prev, team: value, ...(value ? { category: 'all' } : {}) }))
          }
          teamEntries={teamEntries}
        />
      )}
      {filteredEvents.length === 0 ? (
        <p className="text-tcw-accent-900 dark:text-white">
          Keine Termine für die gewählten Filter vorhanden.
        </p>
      ) : (
        <EventList events={filteredEvents} style={style} alignment={alignment} />
      )}
    </>
  )
}
