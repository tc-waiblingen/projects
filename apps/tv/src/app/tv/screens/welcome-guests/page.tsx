import { redirect } from 'next/navigation'
import { QrCode, ScreenAutoAdvance, TvScreenLayout } from '@/components/tv'
import { fetchWelcomeGuestsData, getNextScreenIndex } from '@/lib/tv'

const SCREEN_URL = '/tv/screens/welcome-guests'
const SCREEN_TITLE = 'Herzlich willkommen'
const SCREEN_DURATION = 20000

export default async function WelcomeGuestsPage() {
  const data = await fetchWelcomeGuestsData()
  const nextIndex = getNextScreenIndex(SCREEN_URL)

  if (data.matches.length === 0 && data.tournament == null) {
    redirect(`/tv?next=${nextIndex}`)
  }

  const showDivider = data.matches.length > 0 && data.tournament != null

  return (
    <TvScreenLayout title={SCREEN_TITLE} duration={SCREEN_DURATION}>
      <div className="relative tv-screen-fit overflow-hidden">
        <div className="relative z-10 h-full px-16 pt-44 pb-10">
          <div className="flex h-full items-center justify-center">
            <div className="flex max-w-5xl flex-col gap-10 rounded-3xl border border-white/70 bg-white/70 px-16 py-12 shadow-sm">
              {data.matches.length > 0 && (
                <section className="flex flex-col items-center gap-8 text-center">
                  <h2 className="tv-title font-light text-neutral-900">Wir begrüßen unsere Gäste</h2>
                  <ul className="flex flex-col gap-5">
                    {data.matches.map((m) => (
                      <li key={m.id}>
                        <p className="tv-body-lg text-neutral-900">
                          {m.artikel} <span className="font-semibold">{m.guestClubName}</span>
                        </p>
                        <p className="mt-1 tv-body text-muted">
                          empfangen von unseren {m.homeTeamShortName}
                          {m.startTime && ` (Beginn um ${m.startTime} Uhr)`}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {showDivider && <hr className="border-tcw-accent-200/70" />}

              {data.tournament && (
                <section className="flex flex-col items-center gap-6 text-center">
                  <h2 className="tv-title font-light text-neutral-900">
                    Wir begrüßen die Teilnehmer des heutigen Turniers
                  </h2>
                  <p className="tv-heading font-medium text-neutral-900">{data.tournament.title}</p>

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
