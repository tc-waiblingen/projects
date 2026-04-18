import { AssignmentTable } from '@/components/AssignmentTable'
import { CrestLogo } from '@/components/CrestLogo'
import { MatchList } from '@/components/MatchList'
import { SourceErrorBanner } from '@/components/SourceErrorBanner'
import { getAssignmentsForDate } from '@/lib/assignments'
import { getDb } from '@/lib/db'
import { fetchCourts } from '@/lib/directus/courts'
import { settle } from '@/lib/fetch-result'
import { dateKey, formatCourtType, formatDateLong } from '@/lib/format'
import { fetchMatchesForDate, fetchTournamentForDate } from '@/lib/matches'
import { getSeasonCourtType } from '@tcw/calendar'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'TCW-Platzbelegung heute',
}

export default async function TodayPage() {
  const today = new Date()
  const todayKey = dateKey(today)

  const [matchesResult, tournamentResult, courtsResult] = await Promise.all([
    settle(fetchMatchesForDate(today)),
    settle(fetchTournamentForDate(today)),
    settle(fetchCourts()),
  ])

  const courtType = getSeasonCourtType(today)
  const courts = courtsResult.ok ? courtsResult.data : []
  const seasonCourts = courts.filter((c) => c.type === courtType)
  const matches = matchesResult.ok ? matchesResult.data : []
  const tournament = tournamentResult.ok ? tournamentResult.data : null

  const stored = getAssignmentsForDate(getDb(), todayKey)
  const selections: Record<string, number[]> = {}
  for (const row of stored) {
    if (!selections[row.matchId]) selections[row.matchId] = []
    selections[row.matchId]!.push(row.courtId)
  }

  const hasTournament = tournamentResult.ok && tournament !== null

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="relative mb-6 flex items-center justify-between border-b border-tcw-accent-200 pb-4 dark:border-tcw-accent-800">
        <div className="flex min-w-0 flex-col leading-tight">
          <h1 className="text-2xl font-bold text-body">Platzbelegung heute</h1>
          <span className="text-sm text-muted">{formatDateLong(today)} — {formatCourtType(courtType)}</span>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2">
          <CrestLogo />
        </div>
      </header>

      {!tournamentResult.ok && <SourceErrorBanner source="tournament" variant="inline" />}

      {hasTournament ? (
        <div className="mb-4 rounded-md border border-tcw-red-200 bg-tcw-red-50 px-4 py-3 text-tcw-red-900 dark:border-tcw-red-700 dark:bg-tcw-red-900/30 dark:text-tcw-red-50">
          <strong>Turnier:</strong> {tournament!.title} — alle Plätze belegt.
        </div>
      ) : null}

      {!matchesResult.ok && <SourceErrorBanner source="matches" />}
      {!courtsResult.ok && <SourceErrorBanner source="courts" />}

      {matchesResult.ok && courtsResult.ok && !hasTournament ? (
        matches.length === 0 ? (
          <p className="rounded-md border border-tcw-accent-200 bg-tcw-accent-50 px-4 py-3 text-muted dark:border-tcw-accent-800 dark:bg-tcw-accent-900/30">
            Keine Heimspiele heute.
          </p>
        ) : stored.length === 0 ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            Plätze sind heute noch nicht zugewiesen.
          </p>
        ) : (
          <AssignmentTable courts={seasonCourts} matches={matches} selections={selections} />
        )
      ) : null}

      {matchesResult.ok && !courtsResult.ok && !hasTournament ? (
        <MatchList matches={matches} />
      ) : null}
    </main>
  )
}
