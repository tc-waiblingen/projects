'use client'

import type { CourtUsageDay, CourtUsageHalf } from '@tcw/calendar'

interface CourtUsageDayDetailProps {
  day: CourtUsageDay
  showDayHeader?: boolean
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

function formatCourtType(courtType: 'tennis_indoor' | 'tennis_outdoor'): string {
  return courtType === 'tennis_indoor' ? 'Halle' : 'Freiplätze'
}

function HalfSection({ label, half, courtTypeLabel }: { label: string; half: CourtUsageHalf; courtTypeLabel: string }) {
  if (half.entries.length === 0) return null

  return (
    <div className="mb-4">
      <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">{label}</div>
      {half.entries.map((entry, i) => (
        <div key={i} className="grid grid-cols-[50px_70px_65px_1fr] gap-2 border-b border-gray-100 py-1.5 text-sm dark:border-gray-800">
          <span className="font-bold tabular-nums text-body">{entry.time}</span>
          <span className="text-muted">{entry.courts} Pl. ({courtTypeLabel})</span>
          <span className="text-xs text-muted">{entry.players} Sp.</span>
          <span className="text-body">
            <span className="text-xs text-muted">{entry.league}</span>
            {' — '}
            {entry.teamName} <span className="text-muted">vs</span> {entry.opponent}
          </span>
        </div>
      ))}
    </div>
  )
}

export function CourtUsageDayDetail({ day, showDayHeader = true }: CourtUsageDayDetailProps) {
  const totalCourts = day.am.courts + day.pm.courts
  const totalTeams = day.am.teams + day.pm.teams
  const totalPlayers = day.am.players + day.pm.players
  const courtTypeLabel = formatCourtType(day.courtType)

  return (
    <div>
      {showDayHeader && (
        <div className="mb-3 border-b-2 border-gray-200 pb-2 dark:border-gray-700">
          <span className="text-lg font-bold text-body">{formatDate(day.date)}</span>
          <span className="ml-2 text-xs text-muted">
            {day.tournament
              ? `${courtTypeLabel} — Turnier (alle Plätze)`
              : `${courtTypeLabel} — ${totalCourts} Plätze belegt (${day.am.courts} AM + ${day.pm.courts} PM)`}
          </span>
        </div>
      )}

      {day.tournament ? (
        <div className="border-b border-gray-100 py-1.5 text-sm dark:border-gray-800">
          <span className="mr-2 inline-block rounded bg-red-900/80 px-1.5 py-0.5 text-[10px] font-bold text-red-200">TURNIER</span>
          {day.tournament.title} — alle {courtTypeLabel} belegt
        </div>
      ) : (
        <>
          <HalfSection label="Vormittag (AM)" half={day.am} courtTypeLabel={courtTypeLabel} />
          <HalfSection label="Nachmittag (PM)" half={day.pm} courtTypeLabel={courtTypeLabel} />
        </>
      )}

      {!day.tournament && (
        <div className="mt-3 flex flex-wrap gap-4 rounded-md bg-gray-50 px-3 py-2 text-xs text-muted dark:bg-gray-800/50">
          <span><strong className="text-body">{totalTeams}</strong> Heimmannschaften</span>
          <span><strong className="text-body">{totalCourts}</strong> Plätze belegt</span>
          <span><strong className="text-body">{totalPlayers}</strong> Spieler</span>
          <span>AM: <strong className="text-body">{day.am.courts} Pl.</strong> / <strong className="text-body">{day.am.players} Sp.</strong> | PM: <strong className="text-body">{day.pm.courts} Pl.</strong> / <strong className="text-body">{day.pm.players} Sp.</strong></span>
        </div>
      )}
    </div>
  )
}

export { formatShortDate, formatCourtType }
