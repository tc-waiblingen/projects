'use client'

import { Fragment } from 'react'
import type { CourtUsageMonth } from '@tcw/calendar'

interface CourtUsagePrintTableProps {
  months: CourtUsageMonth[]
}

const WEEKDAYS_DE = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.']

interface EntryRow {
  time: string
  type: string
  courts: number
  players: number | null
  name: string
  opponent: string | null
}

interface DayGroup {
  dateKey: string
  date: Date
  rows: EntryRow[]
  totalCourts: number
  totalPlayers: number
  amCourts: number
  amPlayers: number
  pmCourts: number
  pmPlayers: number
  isTournament: boolean
  endsMonth: boolean
}

function formatShortDate(dateKey: string): string {
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return dateKey
  const [, y, mm, dd] = m
  const d = new Date(Date.UTC(Number(y), Number(mm) - 1, Number(dd)))
  return `${WEEKDAYS_DE[d.getUTCDay()]} ${dd}.${mm}.`
}

function buildGroups(months: CourtUsageMonth[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const month of months) {
    const monthGroups: DayGroup[] = []
    for (const day of month.days) {
      const rows: EntryRow[] = []
      const isTournament = Boolean(day.tournament)
      let totalCourts = 0
      let totalPlayers = 0

      if (day.tournament) {
        totalCourts = day.totalCourtsAvailable
        rows.push({
          time: '',
          type: 'Turnier',
          courts: day.totalCourtsAvailable,
          players: null,
          name: day.tournament.title,
          opponent: null,
        })
      } else {
        const entries = [...day.am.entries, ...day.pm.entries].sort((a, b) =>
          a.time.localeCompare(b.time),
        )
        for (const entry of entries) {
          totalCourts += entry.courts
          totalPlayers += entry.players
          rows.push({
            time: entry.time,
            type: 'Heimspiel',
            courts: entry.courts,
            players: entry.players,
            name: entry.teamShortName ?? entry.teamName,
            opponent: entry.opponent || null,
          })
        }
      }

      monthGroups.push({
        dateKey: day.dateKey,
        date: day.date,
        rows,
        totalCourts,
        totalPlayers,
        amCourts: day.am.courts,
        amPlayers: day.am.players,
        pmCourts: day.pm.courts,
        pmPlayers: day.pm.players,
        isTournament,
        endsMonth: false,
      })
    }
    const last = monthGroups[monthGroups.length - 1]
    if (last) last.endsMonth = true
    groups.push(...monthGroups)
  }
  return groups
}

export function CourtUsagePrintTable({ months }: CourtUsagePrintTableProps) {
  const groups = buildGroups(months)
  if (groups.length === 0) return null

  return (
    <div className="hidden print:block">
      <h2 className="mb-1.5 border-b border-gray-900 pb-0.5 font-bold">Übersicht</h2>
      <table className="w-full border-collapse text-xs tabular-nums">
        <thead>
          <tr className="border-b border-gray-400 text-left">
            <th className="py-1 pr-2 font-semibold">Datum</th>
            <th className="py-1 pr-2 font-semibold">Zeit</th>
            <th className="py-1 pr-2 font-semibold">Art</th>
            <th className="py-1 pr-2 text-right font-semibold">Plätze</th>
            <th className="py-1 pr-2 text-right font-semibold">Spieler</th>
            <th className="py-1 font-semibold">Bezeichnung</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const borderClass = group.endsMonth
              ? 'border-b-2 border-black'
              : 'border-b border-gray-400'
            const showSummary = !group.isTournament
            return (
              <Fragment key={group.dateKey}>
                {group.rows.map((row, i) => {
                  const isLast = i === group.rows.length - 1
                  return (
                    <tr key={i} className={`align-top ${!showSummary && isLast ? borderClass : ''}`}>
                      <td className="py-0.5 pr-2 whitespace-nowrap">{i === 0 ? formatShortDate(group.dateKey) : ''}</td>
                      <td className="py-0.5 pr-2 whitespace-nowrap">{row.time}</td>
                      <td className="py-0.5 pr-2 whitespace-nowrap">{row.type}</td>
                      <td className="py-0.5 pr-2 text-right">{row.courts}</td>
                      <td className="py-0.5 pr-2 text-right">{row.players ?? ''}</td>
                      <td className="py-0.5">
                        {row.name}
                        {row.opponent && (
                          <span className="text-[0.9em] text-gray-500"> vs. {row.opponent}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {showSummary && (
                  <tr className={`${borderClass} text-[0.9em] italic text-gray-600`}>
                    <td className="py-0.5 pr-2"></td>
                    <td className="py-0.5 pr-2"></td>
                    <td className="py-0.5 pr-2 whitespace-nowrap">Summe</td>
                    <td className="py-0.5 pr-2 text-right">{group.totalCourts}</td>
                    <td className="py-0.5 pr-2 text-right">{group.totalPlayers > 0 ? group.totalPlayers : ''}</td>
                    <td className="py-0.5 whitespace-nowrap">
                      vorm. {group.amCourts} Pl./{group.amPlayers} Sp. · nachm. {group.pmCourts} Pl./{group.pmPlayers} Sp.
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
