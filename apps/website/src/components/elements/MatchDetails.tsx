import { clsx } from 'clsx/lite'
import { isMatchPlayed } from '@/lib/match-utils'

export interface MatchDetailsProps {
  homeTeam: string
  homeTeamUrl?: string
  awayTeam: string
  awayTeamUrl?: string
  result?: string // Format: "X:Y"
  reportUrl?: string
  variant?: 'default' | 'compact'
}

interface ParsedResult {
  homeScore: number
  awayScore: number
  winner: 'home' | 'away' | 'draw'
}

export function parseMatchResult(result: string): ParsedResult | null {
  const match = /^(\d+):(\d+)$/.exec(result.trim())
  const homeStr = match?.[1]
  const awayStr = match?.[2]
  if (!homeStr || !awayStr) return null

  const homeScore = parseInt(homeStr, 10)
  const awayScore = parseInt(awayStr, 10)

  let winner: 'home' | 'away' | 'draw' = 'draw'
  if (homeScore > awayScore) {
    winner = 'home'
  } else if (awayScore > homeScore) {
    winner = 'away'
  }

  return { homeScore, awayScore, winner }
}

function TeamName({
  name,
  url,
  isWinner,
  className,
}: {
  name: string
  url?: string
  isWinner: boolean
  className?: string
}) {
  const baseClasses = clsx(
    'truncate text-sm leading-5',
    isWinner
      ? 'font-semibold text-tcw-accent-900 dark:text-white'
      : 'text-body'
  )

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={clsx(
          baseClasses,
          'underline decoration-tcw-accent-400 underline-offset-2 hover:decoration-tcw-accent-600 dark:decoration-tcw-accent-500 dark:hover:decoration-tcw-accent-300',
          className
        )}
      >
        {name}
      </a>
    )
  }

  return <span className={clsx(baseClasses, className)}>{name}</span>
}

function DefaultLayout({
  homeTeam,
  homeTeamUrl,
  awayTeam,
  awayTeamUrl,
  result,
  parsedResult,
  reportUrl,
}: MatchDetailsProps & { parsedResult: ParsedResult | null }) {
  const matchPlayed = isMatchPlayed(result, reportUrl)
  const homeTeamWon = parsedResult?.winner === 'home'
  const awayTeamWon = parsedResult?.winner === 'away'

  return (
    <div className="flex items-start gap-3">
      {parsedResult && matchPlayed && (
        <div className="ml-3 flex flex-col items-center gap-1 rounded-md bg-tcw-accent-100 px-3 py-0.5 dark:bg-tcw-accent-700">
          <span
            className={clsx(
              'text-sm tabular-nums leading-5',
              homeTeamWon
                ? 'font-bold text-tcw-accent-900 dark:text-white'
                : 'text-tcw-accent-700 dark:text-tcw-accent-300'
            )}
          >
            {parsedResult.homeScore}
          </span>
          <span
            className={clsx(
              'text-sm tabular-nums leading-5',
              awayTeamWon
                ? 'font-bold text-tcw-accent-900 dark:text-white'
                : 'text-tcw-accent-700 dark:text-tcw-accent-300'
            )}
          >
            {parsedResult.awayScore}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1">
        <TeamName name={homeTeam} url={homeTeamUrl} isWinner={matchPlayed && homeTeamWon} />
        <TeamName name={awayTeam} url={awayTeamUrl} isWinner={matchPlayed && awayTeamWon} />

        {reportUrl && (
          <a
            href={reportUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-1 text-sm text-tcw-accent-900 underline decoration-tcw-accent-400 underline-offset-2 hover:decoration-tcw-accent-600 dark:text-tcw-accent-100 dark:decoration-tcw-accent-500 dark:hover:decoration-tcw-accent-300"
          >
            {matchPlayed ? 'Spielbericht' : 'Spielberichts-Vorlage'}
          </a>
        )}
      </div>
    </div>
  )
}

function CompactLayout({
  homeTeam,
  homeTeamUrl,
  awayTeam,
  awayTeamUrl,
  parsedResult,
}: MatchDetailsProps & { parsedResult: ParsedResult | null }) {
  const homeTeamWon = parsedResult?.winner === 'home'
  const awayTeamWon = parsedResult?.winner === 'away'

  return (
    <div className="flex items-center gap-2">
      {parsedResult && (
        <span className="shrink-0 rounded bg-tcw-accent-100 px-1.5 py-0.5 text-xs tabular-nums text-tcw-accent-700 dark:bg-tcw-accent-700 dark:text-tcw-accent-200">
          {parsedResult.homeScore}:{parsedResult.awayScore}
        </span>
      )}

      <span className="truncate text-sm leading-5">
        <TeamName name={homeTeam} url={homeTeamUrl} isWinner={homeTeamWon} />
        {' vs. '}
        <TeamName name={awayTeam} url={awayTeamUrl} isWinner={awayTeamWon} />
      </span>
    </div>
  )
}

export function MatchDetails({
  homeTeam,
  homeTeamUrl,
  awayTeam,
  awayTeamUrl,
  result,
  reportUrl,
  variant = 'default',
}: MatchDetailsProps) {
  const parsedResult = result ? parseMatchResult(result) : null

  if (variant === 'compact') {
    return (
      <CompactLayout
        homeTeam={homeTeam}
        homeTeamUrl={homeTeamUrl}
        awayTeam={awayTeam}
        awayTeamUrl={awayTeamUrl}
        parsedResult={parsedResult}
      />
    )
  }

  return (
    <DefaultLayout
      homeTeam={homeTeam}
      homeTeamUrl={homeTeamUrl}
      awayTeam={awayTeam}
      awayTeamUrl={awayTeamUrl}
      result={result}
      parsedResult={parsedResult}
      reportUrl={reportUrl}
    />
  )
}
