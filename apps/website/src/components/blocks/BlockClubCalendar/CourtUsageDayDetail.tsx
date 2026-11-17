'use client'

import type { CourtUsageDay, CourtUsageEntry } from '@tcw/calendar'

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

function formatCourtType(courtType: 'tennis_indoor' | 'tennis_outdoor'): string {
  return courtType === 'tennis_indoor' ? 'Halle' : 'Freiplätze'
}

function EntryRow({ entry, courtTypeLabel }: { entry: CourtUsageEntry; courtTypeLabel: string }) {
  return (
    <div className="grid grid-cols-[50px_70px_65px_1fr] gap-2 border-b border-tcw-accent-100 py-1.5 text-sm dark:border-tcw-accent-700">
      <span className="font-bold tabular-nums text-body">{entry.time}</span>
      <span className="text-muted">{entry.courts} Pl. ({courtTypeLabel})</span>
      <span className="text-xs text-muted">{entry.players} Sp.</span>
      <div>
        {entry.leagueUrl ? (
          <a href={entry.leagueUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-bold text-body text-link">{entry.league}</a>
        ) : (
          <span className="font-bold text-body">{entry.league}</span>
        )}
        <div className="text-muted">{entry.teamName} vs {entry.opponent}</div>
      </div>
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
        <div className="mb-3 border-b-2 border-tcw-accent-200 pb-2 dark:border-tcw-accent-700">
          <span className="text-lg font-bold text-body">{formatDate(day.date)}</span>
        </div>
      )}

      {day.tournament ? (
        <div className="border-b border-tcw-accent-100 py-1.5 text-sm dark:border-tcw-accent-700">
          <span className="mr-2 inline-block rounded bg-tcw-red-700/80 px-1.5 py-0.5 text-[10px] font-bold text-tcw-red-100">TURNIER</span>
          {day.tournament.url ? (
            <a href={day.tournament.url} target="_blank" rel="noopener noreferrer nofollow" className="text-link">{day.tournament.title}</a>
          ) : (
            day.tournament.title
          )} — alle {day.courtType === 'tennis_indoor' ? 'Hallenplätze' : 'Freiplätze'} belegt
        </div>
      ) : (
        <div className="mb-4">
          {[...day.am.entries, ...day.pm.entries]
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((entry, i) => (
              <EntryRow key={i} entry={entry} courtTypeLabel={courtTypeLabel} />
            ))}
        </div>
      )}

      {!day.tournament && (
        <div className="mt-3 flex gap-8 rounded-md bg-tcw-accent-50 px-3 py-2 text-xs text-muted dark:bg-tcw-accent-800">
          <div className="flex flex-col gap-0.5">
            <span><strong className="text-body">{totalTeams}</strong> {totalTeams === 1 ? 'Heimmannschaft' : 'Heimmannschaften'}</span>
            <span><strong className="text-body">{totalCourts}</strong> {totalCourts === 1 ? 'Platz' : 'Plätze'} belegt</span>
            <span><strong className="text-body">{totalPlayers}</strong> Spieler</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span>vorm.: <strong className="text-body">{day.am.courts} Pl.</strong> / <strong className="text-body">{day.am.players} Sp.</strong></span>
            <span>nachm.: <strong className="text-body">{day.pm.courts} Pl.</strong> / <strong className="text-body">{day.pm.players} Sp.</strong></span>
          </div>
        </div>
      )}
    </div>
  )
}

export { formatCourtType }
