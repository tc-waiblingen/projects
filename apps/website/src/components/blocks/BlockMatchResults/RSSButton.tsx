'use client'

import { useMemo } from 'react'
import { RSSIcon } from '@/components/icons/rss-icon'

interface RSSButtonProps {
  team: string | null
}

export function RSSButton({ team }: RSSButtonProps) {
  const feedUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''

    const baseUrl = window.location.origin
    const params = new URLSearchParams()

    if (team) {
      params.set('team', team)
    }

    const queryString = params.toString()
    const path = queryString
      ? `/api/rss/match-results?${queryString}`
      : '/api/rss/match-results'

    return `${baseUrl}${path}`
  }, [team])

  return (
    <a
      href={feedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full bg-taupe-200 px-2.5 py-1 text-xs font-medium text-taupe-700 transition-colors hover:bg-taupe-300 hover:text-taupe-900 dark:bg-taupe-700 dark:text-taupe-200 dark:hover:bg-taupe-600 dark:hover:text-white"
      title="RSS-Feed abonnieren"
    >
      <RSSIcon className="size-3" />
      <span>RSS</span>
    </a>
  )
}
