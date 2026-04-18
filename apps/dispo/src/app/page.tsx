import { AdminHeader } from '@/components/AdminHeader'
import { CourtUsageChanges } from '@/components/calendar/CourtUsageChanges'
import { CourtUsageClient } from '@/components/calendar/CourtUsageClient'
import { SourceErrorBanner } from '@/components/SourceErrorBanner'
import { getAssignmentCountsByMatchForYear } from '@/lib/assignments'
import { getDb } from '@/lib/db'
import { fetchCourts } from '@/lib/directus/courts'
import { settle } from '@/lib/fetch-result'
import { fetchMatchChangeGroups } from '@/lib/match-changes'
import { fetchAllEventsForYear } from '@/lib/matches'

export const dynamic = 'force-dynamic'

export default async function AdminHomePage() {
  const now = new Date()
  const year = now.getFullYear()
  const [eventsResult, courtsResult, changeGroups] = await Promise.all([
    settle(fetchAllEventsForYear(year)),
    settle(fetchCourts()),
    fetchMatchChangeGroups(now),
  ])

  const courts = courtsResult.ok ? courtsResult.data : []
  const indoor = courts.filter((c) => c.type === 'tennis_indoor').length
  const outdoor = courts.filter((c) => c.type === 'tennis_outdoor').length

  const assignmentsByMatch = getAssignmentCountsByMatchForYear(getDb(), year)

  return (
    <main className="mx-auto max-w-7xl p-6">
      <AdminHeader subtitle={`Übersicht ${year}`} />
      <p className="mb-6 text-sm text-muted">Auf einen Tag klicken, um Plätze zuzuweisen.</p>

      {!eventsResult.ok && <SourceErrorBanner source="events" />}
      {!courtsResult.ok && <SourceErrorBanner source="courts" />}

      {eventsResult.ok ? (
        <CourtUsageClient
          events={eventsResult.data}
          indoorCourtCount={indoor}
          outdoorCourtCount={outdoor}
          courtsUnavailable={!courtsResult.ok}
          assignmentsByMatch={Object.fromEntries(assignmentsByMatch)}
        />
      ) : null}

      <CourtUsageChanges groups={changeGroups} now={now} />
    </main>
  )
}
