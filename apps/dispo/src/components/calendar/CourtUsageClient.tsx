'use client'

import { computeCourtUsage, type CalendarEvent } from '@tcw/calendar'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
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

  const [legendOpen, setLegendOpen] = useState(false)

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
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setLegendOpen((v) => !v)}
            className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted hover:text-body"
            aria-expanded={legendOpen}
            aria-controls="court-usage-legend"
          >
            <span>{legendOpen ? 'Legende ausblenden' : 'Legende anzeigen'}</span>
            <svg
              viewBox="0 0 12 12"
              className={`h-3 w-3 transition-transform duration-200 ${legendOpen ? 'rotate-180' : ''}`}
              aria-hidden
            >
              <path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div
            id="court-usage-legend"
            className={`grid overflow-hidden transition-all duration-300 ease-out ${
              legendOpen ? 'mt-2 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="min-h-0">
              <AssignmentLegend />
            </div>
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
