import { LocationPin, QrCode, ScoreBoard, ScreenAutoAdvance, TvScreenLayout } from '@/components/tv'
import { fetchMatchResultsData, generateQrCodeForView, getNextScreenIndex } from '@/lib/tv'
import clsx from 'clsx'
import { matchResultsScreen } from './screen'

const { url: SCREEN_URL, title: SCREEN_TITLE, screenMeta: { duration: SCREEN_DURATION } } = matchResultsScreen
const SHORT_DURATION = 2000

function getGridConfig(count: number) {
  if (count <= 1) return { cols: 'grid-cols-1', flow: '', cardWidth: 'w-[42vw]', teamText: 'tv-heading' }
  if (count <= 2) return { cols: 'grid-cols-2', flow: '', cardWidth: 'w-[42vw]', teamText: 'tv-heading' }
  if (count <= 4) return { cols: 'grid-cols-2', flow: 'grid-flow-col', cardWidth: 'w-[42vw]', teamText: 'tv-heading' }
  if (count <= 6) return { cols: 'grid-cols-3', flow: 'grid-flow-col', cardWidth: 'w-full', teamText: 'tv-body' }
  return { cols: 'grid-cols-4', flow: 'grid-flow-col', cardWidth: 'w-full', teamText: 'tv-body' }
}

export default async function MatchResultsPage() {
  const matchResults = await fetchMatchResultsData()
  const nextIndex = await getNextScreenIndex(SCREEN_URL)

  // Pre-generate QR codes for all matches
  const matchesWithQr = await Promise.all(
    matchResults.results.map(async (match) => {
      const groupQrCode = match.groupUrl ? await generateQrCodeForView(match.groupUrl, 'large') : null
      const reportQrCode = match.reportUrl ? await generateQrCodeForView(match.reportUrl, 'large') : null
      return { ...match, groupQrCode, reportQrCode }
    }),
  )

  const duration = !matchResults.hasResults ? SHORT_DURATION : SCREEN_DURATION
  const { cols, flow, cardWidth, teamText } = getGridConfig(matchesWithQr.length)

  return (
    <TvScreenLayout title={SCREEN_TITLE} duration={duration}>
      <div className="relative tv-screen-fit overflow-hidden">
        <div className="relative z-10 h-full px-16 pt-44 pb-10">
          {!matchResults.hasResults && (
            <div className="flex h-full items-center justify-center text-center">
              <div className="max-w-2xl">
                <p className="tv-message font-light">Im Moment sind keine Ergebnisse verfügbar.</p>
                <p className="mt-4 tv-body opacity-60">
                  Sobald Spiele stattgefunden haben, werden die Ergebnisse hier angezeigt.
                </p>
              </div>
            </div>
          )}

          {matchesWithQr.length > 0 && (
            <div className={clsx('grid h-full grid-rows-2 content-center gap-10', cols, flow)}>
              {matchesWithQr.map((match) => {
                const hasAnyQrCode = match.groupUrl || match.reportUrl

                return (
                  <div
                    key={match.id}
                    className={clsx(
                      'flex h-full flex-col gap-2 justify-self-center rounded-3xl border border-white/70 bg-white/70 px-3 py-2 shadow-sm',
                      cardWidth,
                    )}
                  >
                    {/* Date */}
                    {match.dateString && (
                      <p className="tv-body font-semibold text-neutral-900">
                        {match.dateString}
                        {match.relativeDate && (
                          <span className="ml-2 tv-small font-normal text-neutral-500">({match.relativeDate})</span>
                        )}
                      </p>
                    )}

                    {/* Group - centered */}
                    {match.groupName && (
                      <p className="mt-6 line-clamp-1 shrink-0 text-center tv-heading font-medium text-neutral-900">
                        {match.groupName}
                      </p>
                    )}

                    {/* Teams and score - horizontal layout */}
                    <div className="mt-6 mb-2 flex flex-col gap-1">
                      <div className="mx-auto flex w-[90%] items-center justify-center gap-6 text-center">
                        <span
                          className={clsx(
                            `flex-1 text-right ${teamText} line-clamp-2 font-medium`,
                            match.isHome ? 'text-neutral-900' : 'text-neutral-700',
                            match.homeWins && 'underline',
                          )}
                        >
                          {match.homeTeam}
                        </span>
                        {match.matchScore && (
                          <ScoreBoard homeScore={match.matchScore.home} guestScore={match.matchScore.guest} />
                        )}
                        <span
                          className={clsx(
                            `flex-1 text-left ${teamText} line-clamp-2 font-medium`,
                            !match.isHome ? 'text-neutral-900' : 'text-neutral-700',
                            match.guestWins && 'underline',
                          )}
                        >
                          {match.guestTeam}
                        </span>
                      </div>
                      {/* Sets and games scores on separate line */}
                      {(match.setsScore || match.gamesScore) && (
                        <div className="flex items-center justify-center gap-2 tv-meta text-neutral-400">
                          {match.setsScore && (
                            <span>
                              {match.setsScore.home}:{match.setsScore.guest} Sätze{match.gamesScore && ', '}
                            </span>
                          )}
                          {match.gamesScore && (
                            <span>
                              {match.gamesScore.home}:{match.gamesScore.guest} Spiele
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Location - centered */}
                    {match.location && (
                      <div className="flex items-center justify-center gap-1 tv-meta text-neutral-500">
                        <LocationPin className="h-3 w-3" />
                        <span className="line-clamp-1">{match.location}</span>
                      </div>
                    )}

                    {/* QR Codes */}
                    {hasAnyQrCode && (
                      <div className="mt-3 flex items-center justify-center gap-18">
                        {match.groupQrCode && match.groupUrl && (
                          <QrCode
                            linkUrl={match.groupUrl}
                            qrCodeDataUrl={match.groupQrCode}
                            label="Gruppe"
                            size="large"
                          />
                        )}
                        {match.reportQrCode && match.reportUrl && (
                          <QrCode
                            linkUrl={match.reportUrl}
                            qrCodeDataUrl={match.reportQrCode}
                            label="Spielbericht"
                            size="large"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <ScreenAutoAdvance currentUrl={SCREEN_URL} nextIndex={nextIndex} duration={duration} />
      </div>
    </TvScreenLayout>
  )
}
