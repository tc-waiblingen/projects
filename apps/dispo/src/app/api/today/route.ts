import { getAssignmentsForDate } from '@/lib/assignments'
import { getDb } from '@/lib/db'
import { fetchCourts } from '@/lib/directus/courts'
import { dateKey } from '@/lib/format'
import { fetchMatchesForDate } from '@/lib/matches'
import { getSeasonCourtType } from '@tcw/calendar'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const today = new Date()
  const todayKey = dateKey(today)
  const courtType = getSeasonCourtType(today)

  const [matches, courts] = await Promise.all([fetchMatchesForDate(today), fetchCourts()])
  const courtsById = new Map(courts.map((c) => [c.id, c]))

  const stored = getAssignmentsForDate(getDb(), todayKey)
  const selections: Record<string, number[]> = {}
  for (const row of stored) {
    if (!selections[row.matchId]) selections[row.matchId] = []
    selections[row.matchId]!.push(row.courtId)
  }

  const responseMatches = matches.map((m) => ({
    matchId: m.id,
    time: m.startTime,
    league: m.league,
    leagueShort: m.leagueShort,
    homeTeam: m.homeTeam,
    opponent: m.opponent,
    courts: (selections[m.id] ?? [])
      .map((id) => courtsById.get(id))
      .filter((c): c is NonNullable<typeof c> => c !== undefined)
      .map((c) => ({ id: c.id, name: c.name })),
  }))

  return NextResponse.json(
    {
      date: todayKey,
      courtType,
      matches: responseMatches,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
