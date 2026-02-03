interface ScoreBoardProps {
  homeScore: number
  guestScore: number
}

/**
 * Tennis-style scoreboard display.
 */
export function ScoreBoard({ homeScore, guestScore }: ScoreBoardProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border-2 border-green-700 bg-green-800 px-3 py-2 shadow-lg">
      {/* Home score */}
      <div className="flex h-12 w-10 items-center justify-center rounded border border-green-700 bg-green-900 shadow-inner">
        <span className="text-2xl font-bold tabular-nums text-white">{homeScore}</span>
      </div>

      {/* Separator */}
      <div className="flex flex-col gap-0.5 px-1">
        <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
        <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
      </div>

      {/* Guest score */}
      <div className="flex h-12 w-10 items-center justify-center rounded border border-green-700 bg-green-900 shadow-inner">
        <span className="text-2xl font-bold tabular-nums text-white">{guestScore}</span>
      </div>
    </div>
  )
}
