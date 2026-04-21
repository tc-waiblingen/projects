import { QrCode, ScreenAutoAdvance, TvScreenLayout } from '@/components/tv'
import { fetchWelcomeGuestsData, getNextScreenIndex } from '@/lib/tv'
import { redirect } from 'next/navigation'
import { welcomeGuestsScreen } from './screen'

const { url: SCREEN_URL, title: SCREEN_TITLE, screenMeta: { duration: SCREEN_DURATION } } = welcomeGuestsScreen

export const revalidate = 300

export default async function WelcomeGuestsPage() {
  const data = await fetchWelcomeGuestsData()
  const nextIndex = await getNextScreenIndex(SCREEN_URL)

  if (data.matches.length === 0 && data.tournament == null) {
    redirect(`/tv?next=${nextIndex}`)
  }

  const hasMatches = data.matches.length > 0
  const hasTournament = data.tournament != null
  const showBoth = hasMatches && hasTournament

  return (
    <TvScreenLayout title={SCREEN_TITLE} duration={SCREEN_DURATION}>
      <div className="relative tv-screen-fit overflow-hidden">
        <div className="relative z-10 h-full px-16 pt-44 pb-10">
          <div className="flex h-full items-center justify-center">
            <div className="flex max-w-5xl flex-col gap-10 rounded-3xl border border-white/70 bg-white/70 px-16 py-12 shadow-sm">
              {showBoth && (
                <h2 className="tv-title text-center font-light text-neutral-900">Herzlich willkommen</h2>
              )}

              {hasMatches && (
                <section className="flex flex-col items-center gap-8 text-center">
                  {showBoth ? (
                    <p className="tv-small uppercase text-muted">Heimspiele heute</p>
                  ) : (
                    <h2 className="tv-title font-light text-neutral-900">Wir begrüßen unsere Gäste</h2>
                  )}
                  <ul className="flex flex-col gap-8">
                    {data.matches.map((m) => (
                      <li key={m.id} className="flex flex-col gap-1">
                        <p className="tv-message font-semibold text-neutral-900">{m.guestClubName}</p>
                        <p className="tv-body text-muted">
                          zu Gast bei unseren {m.homeTeamShortName}
                          {m.startTime && ` · Beginn ${m.startTime} Uhr`}
                          {m.courts.length > 0 && ` auf ${m.courts.join(', ')}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {showBoth && <hr className="my-4 border-tcw-accent-200/70" />}

              {data.tournament && (
                <section className="flex flex-col items-center gap-6 text-center">
                  {showBoth ? (
                    <p className="tv-small uppercase text-muted">Turnier heute</p>
                  ) : (
                    <h2 className="tv-title font-light text-neutral-900">
                      Wir begrüßen die Teilnehmer des heutigen Turniers
                    </h2>
                  )}
                  <p className="tv-message font-semibold text-neutral-900">{data.tournament.title}</p>

                  {(data.tournament.tournamentQrCode || data.tournament.callForEntriesQrCode) && (
                    <div className="mt-2 flex items-start justify-center gap-16">
                      {data.tournament.tournamentQrCode && data.tournament.tournamentUrl && (
                        <QrCode
                          linkUrl={data.tournament.tournamentUrl}
                          qrCodeDataUrl={data.tournament.tournamentQrCode}
                          label="Details"
                          size="large"
                        />
                      )}
                      {data.tournament.callForEntriesQrCode && data.tournament.callForEntriesUrl && (
                        <QrCode
                          linkUrl={data.tournament.callForEntriesUrl}
                          qrCodeDataUrl={data.tournament.callForEntriesQrCode}
                          label="Ausschreibung"
                          size="large"
                        />
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>

        <ScreenAutoAdvance currentUrl={SCREEN_URL} nextIndex={nextIndex} duration={SCREEN_DURATION} />
      </div>
    </TvScreenLayout>
  )
}
