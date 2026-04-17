import { MatchDetails } from '@/components/elements/MatchDetails'
import { formatRelativeDate } from '@/lib/relative-date'
import type { CalendarEvent, MatchEventMetadata } from '@tcw/calendar'

interface MatchResultCardProps {
  match: CalendarEvent
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

      {metadata.group && (
        <div>
          {metadata.groupUrl ? (
            <a
              href={metadata.groupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-tcw-accent-900 underline decoration-tcw-accent-400 underline-offset-2 hover:decoration-tcw-accent-600 dark:text-tcw-accent-100 dark:decoration-tcw-accent-500 dark:hover:decoration-tcw-accent-300"
            >
              {metadata.group}
            </a>
          ) : (
            <span className="font-medium text-body">
              {metadata.group}
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
