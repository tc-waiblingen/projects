import { AdminHeader } from '@/components/AdminHeader'
import { AssignmentForm } from '@/components/AssignmentForm'
import { MatchList } from '@/components/MatchList'
import { SourceErrorBanner } from '@/components/SourceErrorBanner'
import { getAssignmentsForDate } from '@/lib/assignments'
import { getDb } from '@/lib/db'
import { fetchCourts } from '@/lib/directus/courts'
import { settle } from '@/lib/fetch-result'
import { formatCourtType, formatDateLong, parseIsoDate } from '@/lib/format'
import { fetchMatchesForDate, fetchTournamentForDate } from '@/lib/matches'
import { getSeasonCourtType } from '@tcw/calendar'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface DayPageProps {
  params: Promise<{ date: string }>
}

export default async function DayPage({ params }: DayPageProps) {
  const { date: dateParam } = await params
  const date = parseIsoDate(dateParam)
  if (!date) notFound()

  const [matchesResult, tournamentResult, courtsResult] = await Promise.all([
    settle(fetchMatchesForDate(date)),
    settle(fetchTournamentForDate(date)),
    settle(fetchCourts()),
  ])

  const courtType = getSeasonCourtType(date)
  const courts = courtsResult.ok ? courtsResult.data : []
  const seasonCourts = courts.filter((c) => c.type === courtType)
  const matches = matchesResult.ok ? matchesResult.data : []
  const tournament = tournamentResult.ok ? tournamentResult.data : null

  const stored = getAssignmentsForDate(getDb(), dateParam)
  const initialSelections: Record<string, number[]> = {}
  for (const row of stored) {
    if (!initialSelections[row.matchId]) initialSelections[row.matchId] = []
    initialSelections[row.matchId]!.push(row.courtId)
  }

  const subtitle = courtsResult.ok
    ? `${formatDateLong(date)} — ${formatCourtType(courtType)} (${seasonCourts.length} verfügbar)`
    : `${formatDateLong(date)} — ${formatCourtType(courtType)}`

  const hasTournament = tournamentResult.ok && tournament !== null

  return (
    <main className="mx-auto max-w-7xl p-6">
      <AdminHeader subtitle={subtitle} />

      {!tournamentResult.ok && <SourceErrorBanner source="tournament" variant="inline" />}

      {hasTournament ? (
        <div className="mb-4 rounded-md border border-tcw-red-200 bg-tcw-red-50 px-4 py-3 text-tcw-red-900 dark:border-tcw-red-700 dark:bg-tcw-red-900/30 dark:text-tcw-red-50">
          <strong>Turnier:</strong>{' '}
          {tournament!.url ? (
            <a href={tournament!.url} target="_blank" rel="noopener noreferrer nofollow" className="cursor-pointer underline">
              {tournament!.title}
            </a>
          ) : (
            tournament!.title
          )}{' '}
          — alle Plätze belegt. Keine manuelle Zuweisung nötig.
        </div>
      ) : null}

      {!matchesResult.ok && <SourceErrorBanner source="matches" />}
      {!courtsResult.ok && <SourceErrorBanner source="courts" />}

      {matchesResult.ok && courtsResult.ok && !hasTournament ? (
        matches.length === 0 ? (
          <div className="rounded-md border border-tcw-accent-200 bg-tcw-accent-50 px-4 py-3 text-muted dark:border-tcw-accent-800 dark:bg-tcw-accent-900/30">
            Keine Heimspiele an diesem Tag.
          </div>
        ) : seasonCourts.length === 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            Keine {formatCourtType(courtType)} im System hinterlegt — Plätze in Directus pflegen.
          </div>
        ) : (
          <AssignmentForm date={dateParam} courts={seasonCourts} matches={matches} initialSelections={initialSelections} />
        )
      ) : null}

      {matchesResult.ok && !courtsResult.ok && !hasTournament ? (
        <MatchList matches={matches} />
      ) : null}
    </main>
  )
}
