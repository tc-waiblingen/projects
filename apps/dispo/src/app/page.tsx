import { AdminHeader } from '@/components/AdminHeader'
import { CourtUsageChanges } from '@/components/calendar/CourtUsageChanges'
import { CourtUsageClient } from '@/components/calendar/CourtUsageClient'
import { fetchCourts } from '@/lib/directus/courts'
import { fetchMatchChangeGroups } from '@/lib/match-changes'
import { fetchAllEventsForYear } from '@/lib/matches'

export const dynamic = 'force-dynamic'

export default async function AdminHomePage() {
  const now = new Date()
  const year = now.getFullYear()
  const [events, courts, changeGroups] = await Promise.all([
    fetchAllEventsForYear(year),
    fetchCourts(),
    fetchMatchChangeGroups(now),
  ])
  const indoor = courts.filter((c) => c.type === 'tennis_indoor').length
  const outdoor = courts.filter((c) => c.type === 'tennis_outdoor').length

  return (
    <main className="mx-auto max-w-7xl p-6">
      <AdminHeader subtitle={`Übersicht ${year}`} />
      <p className="mb-6 text-sm text-muted">
        Auf einen Tag klicken, um Plätze zuzuweisen.
      </p>
      <CourtUsageClient events={events} indoorCourtCount={indoor} outdoorCourtCount={outdoor} />
      <CourtUsageChanges groups={changeGroups} now={now} />
    </main>
  )
}
