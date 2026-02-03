import { MatchDetails } from '@/components/elements/MatchDetails'
import type { CalendarEvent, MatchEventMetadata } from '@tcw/calendar'

interface MatchResultCardProps {
  match: CalendarEvent
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'heute'
  } else if (diffDays === 1) {
    return 'gestern'
  } else if (diffDays < 7) {
    return `vor ${diffDays} Tagen`
  } else if (diffDays < 14) {
    return 'vor einer Woche'
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `vor ${weeks} Wochen`
  } else if (diffDays < 60) {
    return 'vor einem Monat'
  } else {
    const months = Math.floor(diffDays / 30)
    return `vor ${months} Monaten`
  }
}

export function MatchResultCard({ match }: MatchResultCardProps) {
  const metadata = match.metadata as MatchEventMetadata
  const relativeDate = formatRelativeDate(match.startDate)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-tcw-accent-200 bg-white p-4 dark:border-tcw-accent-700 dark:bg-tcw-accent-800">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-taupe-500 dark:text-taupe-400">
          {relativeDate}
        </span>
        {!metadata.isHome && (
          <span className="rounded-full bg-tcw-accent-100 px-2 py-0.5 text-xs font-medium text-tcw-accent-700 dark:bg-tcw-accent-700 dark:text-tcw-accent-100">
            Auswärts
          </span>
        )}
      </div>

      {metadata.league && (
        <div>
          {metadata.leagueUrl ? (
            <a
              href={metadata.leagueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-tcw-accent-900 underline decoration-tcw-accent-400 underline-offset-2 hover:decoration-tcw-accent-600 dark:text-tcw-accent-100 dark:decoration-tcw-accent-500 dark:hover:decoration-tcw-accent-300"
            >
              {metadata.league}
            </a>
          ) : (
            <span className="font-medium text-body">
              {metadata.league}
            </span>
          )}
        </div>
      )}

      <MatchDetails
        homeTeam={metadata.homeTeam}
        homeTeamUrl={metadata.homeTeamUrl}
        awayTeam={metadata.awayTeam}
        awayTeamUrl={metadata.awayTeamUrl}
        result={metadata.result}
        reportUrl={metadata.reportUrl}
      />
    </div>
  )
}
