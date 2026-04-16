'use client'

import { useMemo } from 'react'
import { CalendarIcon } from '@/components/icons/calendar-icon'
import type { CategoryFilter } from './FilterControls'

interface ICalButtonProps {
  category: CategoryFilter
  team: string | null
}

export function ICalButton({ category, team }: ICalButtonProps) {
  const subscriptionUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''

    const baseUrl = window.location.origin
    const params = new URLSearchParams()

    if (category !== 'all') {
      params.set('category', category)
    }

    if (team) {
      params.set('team', team)
    }

    const queryString = params.toString()
    const path = queryString ? `/api/calendar?${queryString}` : '/api/calendar'

    return `webcal://${baseUrl.replace(/^https?:\/\//, '')}${path}`
  }, [category, team])

  const handleClick = () => {
    if (subscriptionUrl) {
      window.location.href = subscriptionUrl
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-taupe-200 px-2.5 py-1 text-xs font-medium text-taupe-700 transition-colors hover:bg-taupe-300 hover:text-taupe-900 dark:bg-taupe-700 dark:text-taupe-200 dark:hover:bg-taupe-600 dark:hover:text-white"
      title="Kalender per iCal abonnieren (berücksichtigt gesetzte Filter)"
    >
      <CalendarIcon className="size-3" />
      <span>Abonnieren</span>
    </button>
  )
}
