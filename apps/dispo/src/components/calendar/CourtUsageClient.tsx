'use client'

import { computeCourtUsage, type CalendarEvent } from '@tcw/calendar'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import {
  computeAssignmentStatusByDate,
  type AssignmentStatus,
} from '@/lib/assignment-status'
import { AssignmentLegend } from './AssignmentLegend'
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
        <AssignmentLegend />
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
