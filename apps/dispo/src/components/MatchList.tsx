import type { DayMatch } from '@/lib/matches'

interface MatchListProps {
  matches: DayMatch[]
}

export function MatchList({ matches }: MatchListProps) {
  if (matches.length === 0) {
    return (
      <p className="rounded-md border border-tcw-accent-200 bg-tcw-accent-50 px-4 py-3 text-muted dark:border-tcw-accent-800 dark:bg-tcw-accent-900/30">
        Keine Heimspiele an diesem Tag.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-tcw-accent-200 rounded-md border border-tcw-accent-200 dark:divide-tcw-accent-800 dark:border-tcw-accent-800">
      {matches.map((m) => (
        <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2 text-sm">
          <span className="font-mono tabular-nums text-body">{m.startTime}</span>
          <span className="text-body">
            {m.homeTeam} <span className="text-muted">vs</span> {m.opponent}
          </span>
          {m.leagueShort ? <span className="ml-auto text-xs text-muted">{m.leagueShort}</span> : null}
        </li>
      ))}
    </ul>
  )
}
