import { AdminHeader } from '@/components/AdminHeader'
import { DayNavigator, type DayStatus } from '@/components/DayNavigator'
import { DispoApp } from '@/components/dispo/DispoApp'
import type { DispoAssignment, DispoMatch } from '@/components/dispo/types'
import { MatchList } from '@/components/MatchList'
import { SourceErrorBanner } from '@/components/SourceErrorBanner'
import { computeAssignmentStatusByDate } from '@/lib/assignment-status'
import { getAssignmentCountsByMatchForYear, getAssignmentsForDate } from '@/lib/assignments'
import { getDb } from '@/lib/db'
import { fetchCourts } from '@/lib/directus/courts'
import { fetchAreaMapSvg } from '@/lib/directus/fetchAreaMapSvg'
import { fetchGlobalAreaMapId } from '@/lib/directus/global'
import { fetchEbusyReservationsForDate, type BookingsByCourt } from '@/lib/ebusy/reservations'
import { settle } from '@/lib/fetch-result'
import { formatCourtType, formatDateLong, parseIsoDate, dateKey } from '@/lib/format'
import { fetchMatchChangeGroups } from '@/lib/match-changes'
import { fetchAllEventsForYear, fetchMatchesForDate, fetchTournamentForDate } from '@/lib/matches'
import { getPlansForDate } from '@/lib/match-plans'
import { defaultDurationForCourtType } from '@/lib/plan-helpers'
import { getCourtCount, getSeasonCourtType, type MatchEventMetadata } from '@tcw/calendar'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface DayPageProps {
  params: Promise<{ date: string }>
}

export default async function DayPage({ params }: DayPageProps) {
  const { date: dateParam } = await params
  const date = parseIsoDate(dateParam)
  if (!date) notFound()

  const areaMapIdPromise = fetchGlobalAreaMapId()

  const year = date.getFullYear()
  const [matchesResult, tournamentResult, courtsResult, changeGroups, yearEvents] = await Promise.all([
    settle(fetchMatchesForDate(date)),
    settle(fetchTournamentForDate(date)),
    settle(fetchCourts()),
    fetchMatchChangeGroups(new Date()),
    fetchAllEventsForYear(year),
  ])

  const homeMatchDateKeys: string[] = (() => {
    const keys = new Set<string>()
    for (const ev of yearEvents) {
      if (ev.source !== 'match') continue
      const meta = ev.metadata as MatchEventMetadata
      if (!meta.isHome) continue
      keys.add(dateKey(ev.startDate))
    }
    return [...keys].sort()
  })()

  const db = getDb()
  const assignmentCountsByMatch = getAssignmentCountsByMatchForYear(db, year)
  const assignmentStatusByDate = computeAssignmentStatusByDate(yearEvents, assignmentCountsByMatch)
  const dayStatusByKey: Record<string, DayStatus> = {}
  for (const [key, status] of assignmentStatusByDate) {
    dayStatusByKey[key] = status === 'exact' ? 'complete' : 'incomplete'
  }

  const areaMapId = await areaMapIdPromise
  const lageplanSvg = areaMapId ? await fetchAreaMapSvg(areaMapId) : null

  const courtType = getSeasonCourtType(date)
  const courts = courtsResult.ok ? courtsResult.data : []
  const seasonCourts = courts.filter((c) => c.type === courtType)
  const matches = matchesResult.ok ? matchesResult.data : []
  const tournament = tournamentResult.ok ? tournamentResult.data : null

  let bookingsByCourt: BookingsByCourt = {}
  if (courts.length > 0) {
    try {
      bookingsByCourt = await fetchEbusyReservationsForDate(date, courts)
    } catch (error) {
      console.error('day/[date]: eBuSy fetch failed:', error)
    }
  }

  const dayKey = dateKey(date)
  const storedRows = getAssignmentsForDate(db, dateParam)
  const storedPlans = getPlansForDate(db, dateParam)

  const plansById = new Map(storedPlans.map((p) => [p.matchId, p]))
  const courtIdsByMatch = new Map<string, number[]>()
  for (const row of storedRows) {
    const list = courtIdsByMatch.get(row.matchId)
    if (list) list.push(row.courtId)
    else courtIdsByMatch.set(row.matchId, [row.courtId])
  }

  const courtById = new Map(courts.map((c) => [c.id, c]))
  const initialAssignments: DispoAssignment[] = []
  for (const match of matches) {
    const courtIds = courtIdsByMatch.get(match.id)
    if (!courtIds || courtIds.length === 0) continue
    const plan = plansById.get(match.id)
    const firstCourt = courtById.get(courtIds[0]!)
    const fallbackDuration = firstCourt ? defaultDurationForCourtType(firstCourt.type) : 5.5
    initialAssignments.push({
      matchId: match.id,
      courtIds,
      startTime: plan?.startTime ?? match.startTime,
      durationH: plan?.durationH ?? fallbackDuration,
    })
  }

  const dispoMatches: DispoMatch[] = matches.map((m) => {
    const expected = getCourtCount(m.group || m.league || '')
    return {
      ...m,
      minCourts: expected,
      maxCourts: expected * 2,
    }
  })

  const todaysChangeGroup = changeGroups.find((g) => g.dateKey === dayKey)
  const recentChangeMatchIds = todaysChangeGroup
    ? Array.from(new Set(todaysChangeGroup.entries.map((e) => e.matchId)))
    : []

  const hasTournament = tournamentResult.ok && tournament !== null
  const showDispo =
    matchesResult.ok && courtsResult.ok && !hasTournament && matches.length > 0 && seasonCourts.length > 0

  const minCourtsTotal = dispoMatches.reduce((sum, m) => sum + m.minCourts, 0)
  const subtitle = showDispo
    ? `Platzdisposition für ${matches.length} ${matches.length === 1 ? 'Heimspiel' : 'Heimspiele'} (min. ${minCourtsTotal} ${minCourtsTotal === 1 ? 'Platz' : 'Plätze'} benötigt)`
    : undefined

  return (
    <div className="flex h-screen flex-col">
      <main className="mx-auto w-full max-w-7xl shrink-0 px-6 pt-6 pb-2">
        <AdminHeader
          title={
            <DayNavigator
              dateKey={dateParam}
              formattedDate={formatDateLong(date)}
              homeMatchDateKeys={homeMatchDateKeys}
              statusByKey={dayStatusByKey}
            />
          }
          subtitle={subtitle}
        />

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

        {matchesResult.ok && courtsResult.ok && !hasTournament && matches.length === 0 && (
          <div className="rounded-md border border-tcw-accent-200 bg-tcw-accent-50 px-4 py-3 text-muted dark:border-tcw-accent-800 dark:bg-tcw-accent-900/30">
            Keine Heimspiele an diesem Tag.
          </div>
        )}
        {matchesResult.ok && courtsResult.ok && !hasTournament && matches.length > 0 && seasonCourts.length === 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
            Keine {formatCourtType(courtType)} im System hinterlegt — Plätze in Directus pflegen.
          </div>
        )}

        {matchesResult.ok && !courtsResult.ok && !hasTournament ? <MatchList matches={matches} /> : null}
      </main>

      {showDispo ? (
        <DispoApp
          date={dateParam}
          courts={courts}
          matches={dispoMatches}
          initialAssignments={initialAssignments}
          recentChangeMatchIds={recentChangeMatchIds}
          lageplanSvg={lageplanSvg}
          bookingsByCourt={bookingsByCourt}
        />
      ) : null}
    </div>
  )
}
