'use client'

import type { CalendarEvent } from '@tcw/calendar'

interface CourtUsageClientProps {
  events: CalendarEvent[]
  indoorCourtCount: number
  outdoorCourtCount: number
  serverNow: number
}

export function CourtUsageClient({ events, indoorCourtCount, outdoorCourtCount, serverNow }: CourtUsageClientProps) {
  return <div>Court usage view — {events.length} events, {indoorCourtCount} indoor, {outdoorCourtCount} outdoor courts</div>
}
