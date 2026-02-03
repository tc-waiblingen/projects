'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { CalendarEvent, ClubEventMetadata, MatchEventMetadata } from '@tcw/calendar'
import { FilterControls, type CategoryFilter } from './FilterControls'
import { EventList } from './EventList'
import { useTocSafe } from '@/components/toc'

interface FilterState {
  futureOnly: boolean
  category: CategoryFilter
  group: string | null
}

const DEFAULT_STATE: FilterState = {
  futureOnly: true,
  category: 'all',
  group: null,
}

function parseHashState(): Partial<FilterState> {
  if (typeof window === 'undefined') return {}

  const hash = window.location.hash.slice(1)
  if (!hash) return {}

  const params = new URLSearchParams(hash)
  const state: Partial<FilterState> = {}

  const futureParam = params.get('future')
  if (futureParam === '0') {
    state.futureOnly = false
  }

  const categoryParam = params.get('category')
  if (categoryParam && ['matches', 'tournaments', 'club', 'beginners', 'children'].includes(categoryParam)) {
    state.category = categoryParam as CategoryFilter
  }

  const groupParam = params.get('group')
  if (groupParam) {
    state.group = groupParam
  }

  return state
}

function buildHashString(state: FilterState): string {
  const params = new URLSearchParams()

  if (!state.futureOnly) {
    params.set('future', '0')
  }

  if (state.category !== 'all') {
    params.set('category', state.category)
  }

  if (state.group) {
    params.set('group', state.group)
  }

  const hashString = params.toString()
  return hashString ? `#${hashString}` : ''
}

interface CalendarClientProps {
  events: CalendarEvent[]
  groupNames: string[]
  serverNow: number
}

export function CalendarClient({ events, groupNames, serverNow }: CalendarClientProps) {
  const [state, setState] = useState<FilterState>(DEFAULT_STATE)
  const [isHydrated, setIsHydrated] = useState(false)
  const isHashUpdate = useRef(false)
  const { refresh } = useTocSafe()

  // Use server timestamp to avoid hydration mismatch
  const now = useMemo(() => new Date(serverNow), [serverNow])

  // Apply hash state after hydration to avoid mismatch
  // This subscribes to the URL hash as an external data source
  useEffect(() => {
    const hashState = parseHashState()
    const applyState = () => {
      if (Object.keys(hashState).length > 0) {
        setState((prev) => ({ ...prev, ...hashState }))
      }
      setIsHydrated(true)
    }
    // Use requestAnimationFrame to avoid synchronous setState warning
    const rafId = requestAnimationFrame(applyState)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Update hash on state change (skip until hydrated)
  useEffect(() => {
    if (!isHydrated || isHashUpdate.current) {
      isHashUpdate.current = false
      return
    }

    const hashString = buildHashString(state)
    const newUrl = window.location.pathname + window.location.search + hashString
    window.history.replaceState(null, '', newUrl)
  }, [state, isHydrated])

  // Listen for popstate to handle browser navigation
  useEffect(() => {
    const handlePopState = () => {
      isHashUpdate.current = true
      const hashState = parseHashState()
      setState({ ...DEFAULT_STATE, ...hashState })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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

      // Group filter (only applies to match events)
      if (state.group) {
        if (event.source !== 'match') {
          return false
        }
        const metadata = event.metadata as MatchEventMetadata
        if (metadata.league !== state.group) {
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
      <FilterControls
        futureOnly={state.futureOnly}
        onFutureOnlyChange={(value) => setState((prev) => ({ ...prev, futureOnly: value }))}
        category={state.category}
        onCategoryChange={(value) => setState((prev) => ({ ...prev, category: value }))}
        group={state.group}
        onGroupChange={(value) => setState((prev) => ({ ...prev, group: value }))}
        groupNames={groupNames}
      />
      {filteredEvents.length === 0 ? (
        <p className="text-tcw-accent-900 dark:text-white">
          Keine Termine für die gewählten Filter vorhanden.
        </p>
      ) : (
        <EventList events={filteredEvents} />
      )}
    </>
  )
}
