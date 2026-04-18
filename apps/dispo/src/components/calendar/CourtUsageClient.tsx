'use client'

import { computeCourtUsage, type CalendarEvent } from '@tcw/calendar'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { CourtUsageGrid } from './CourtUsageGrid'

interface CourtUsageClientProps {
  events: CalendarEvent[]
  indoorCourtCount: number
  outdoorCourtCount: number
  courtsUnavailable?: boolean
}

export function CourtUsageClient({
  events,
  indoorCourtCount,
  outdoorCourtCount,
  courtsUnavailable = false,
}: CourtUsageClientProps) {
  const router = useRouter()

  const months = useMemo(
    () =>
      computeCourtUsage({
        events,
        indoorCourtCount,
        outdoorCourtCount,
        year: new Date().getFullYear(),
      }),
    [events, indoorCourtCount, outdoorCourtCount],
  )

  const handleDayClick = useCallback(
    (dateKey: string) => {
      router.push(`/day/${dateKey}`)
    },
    [router],
  )

  return (
    <div>
      {courtsUnavailable ? (
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted">
          <span>
            <strong>T</strong> = Turnier
          </span>
          <span>vorm.+nachm. Spiele</span>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted">
          <span>
            <span className="mr-1 inline-block h-3 w-3 rounded bg-green-900/80" /> Niedrig
          </span>
          <span>
            <span className="mr-1 inline-block h-3 w-3 rounded bg-amber-900/80" /> Mittel
          </span>
          <span>
            <span className="mr-1 inline-block h-3 w-3 rounded bg-red-900/80" /> Hoch / Turnier
          </span>
          <span>
            vorm.+nachm. Plätze | <strong>T</strong> = Turnier
          </span>
        </div>
      )}
      <CourtUsageGrid months={months} onDayClick={handleDayClick} neutral={courtsUnavailable} />
    </div>
  )
}
