interface ScoreBoardProps {
  homeScore: number
  guestScore: number
}

/**
 * Tennis-style scoreboard display.
 */
export function ScoreBoard({ homeScore, guestScore }: ScoreBoardProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border-2 border-green-700 bg-green-800 px-4 py-3 shadow-lg">
      {/* Home score */}
      <div className="flex h-16 w-14 items-center justify-center rounded-lg border border-green-700 bg-green-900 shadow-inner">
        <span className="text-4xl font-bold tabular-nums text-white">{homeScore}</span>
      </div>

      {/* Separator */}
      <div className="flex flex-col gap-1 px-1">
        <div className="h-2 w-2 rounded-full bg-white"></div>
        <div className="h-2 w-2 rounded-full bg-white"></div>
      </div>

      {/* Guest score */}
      <div className="flex h-16 w-14 items-center justify-center rounded-lg border border-green-700 bg-green-900 shadow-inner">
        <span className="text-4xl font-bold tabular-nums text-white">{guestScore}</span>
      </div>
    </div>
  )
}
