'use client'

import { computeCourtUsage, type CalendarEvent } from '@tcw/calendar'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import {
  computeAssignmentStatusByDate,
  type AssignmentStatus,
} from '@/lib/assignment-status'
import { CourtUsageGrid } from './CourtUsageGrid'

interface CourtUsageClientProps {
  events: CalendarEvent[]
  indoorCourtCount: number
  outdoorCourtCount: number
  courtsUnavailable?: boolean
  assignmentsByMatch: Record<string, number>
}

export function CourtUsageClient({
  events,
  indoorCourtCount,
  outdoorCourtCount,
  courtsUnavailable = false,
  assignmentsByMatch,
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

  const statusByDate = useMemo<Map<string, AssignmentStatus>>(
    () =>
      courtsUnavailable
        ? new Map()
        : computeAssignmentStatusByDate(events, new Map(Object.entries(assignmentsByMatch))),
    [events, assignmentsByMatch, courtsUnavailable],
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
        <div className="mb-4 space-y-2 text-xs text-muted">
          <div className="flex flex-wrap gap-3">
            <span className="font-semibold text-body">Auslastung:</span>
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
          <div className="flex flex-wrap gap-3">
            <span className="font-semibold text-body">Zuweisung:</span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded bg-red-900/85" /> Keine
            </span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded bg-orange-700/90" /> Unvollständig
            </span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded bg-green-800/90" /> Passt
            </span>
            <span>
              <span className="mr-1 inline-block h-3 w-3 rounded bg-emerald-500/75" /> Mehr als nötig
            </span>
          </div>
        </div>
      )}
      <CourtUsageGrid
        months={months}
        onDayClick={handleDayClick}
        neutral={courtsUnavailable}
        statusByDate={statusByDate}
      />
    </div>
  )
}
