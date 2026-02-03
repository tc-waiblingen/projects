import { LocationPin, QrCode, ScreenAutoAdvance, StarBadge, TvScreenLayout } from '@/components/tv'
import { fetchScheduleData, formatTimeRange, generateQrCodeForView, getNextScreenIndex, getRelativeDateText, isImportantEvent } from '@/lib/tv'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

const SCREEN_URL = '/tv/screens/club-schedule'
const SCREEN_TITLE = 'Vereinskalender'
const SCREEN_DURATION = 30000
const SHORT_DURATION = 2000

const CALENDAR_URL = 'https://tc-waiblingen.de/kalender'

export default async function ClubSchedulePage() {
  const schedule = await fetchScheduleData()
  const today = new Date()
  const nextIndex = getNextScreenIndex(SCREEN_URL)

  // Generate QR code for website calendar
  const calendarQrCode = await generateQrCodeForView(CALENDAR_URL, 'large', true)

  // Pre-generate QR codes for events that need them
  const dayPanelsWithQr = await Promise.all(
    schedule.dayPanels.map(async (panel) => ({
      ...panel,
      events: await Promise.all(
        panel.events.map(async (event) => {
          const qrData = { ...event } as typeof event & {
            groupQrCode?: string | null
            callForEntriesQrCode?: string | null
            registrationQrCode?: string | null
          }

          if (event.source === 'match' && event.groupUrl) {
            qrData.groupQrCode = await generateQrCodeForView(event.groupUrl, 'small')
          }

          if (event.source === 'tournament') {
            if (event.callForEntriesUrl) {
              qrData.callForEntriesQrCode = await generateQrCodeForView(event.callForEntriesUrl, 'small')
            }
            if (event.registrationUrl) {
              qrData.registrationQrCode = await generateQrCodeForView(event.registrationUrl, 'small')
            }
          }

          return qrData
        })
      ),
    }))
  )

  const duration = !schedule.hasEvents ? SHORT_DURATION : SCREEN_DURATION

  return (
    <TvScreenLayout title={SCREEN_TITLE} duration={duration}>
      <div className="relative h-screen overflow-hidden">
        {calendarQrCode && (
          <div className="absolute bottom-8 right-8 z-20 flex items-center gap-3 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/50">
            <QrCode linkUrl={CALENDAR_URL} qrCodeDataUrl={calendarQrCode} size="large" />
            <span className="tv-small">
              Zum gesamten <br /> Vereinskalender
            </span>
          </div>
        )}

        <div className="relative z-10 h-full px-16 pb-6 pt-36">
          {!schedule.hasEvents && (
            <div className="flex h-full items-center justify-center text-center">
              <div className="max-w-2xl">
                <p className="tv-message font-light">Im Moment sind keine Termine eingetragen.</p>
                <p className="mt-4 tv-body opacity-60">Sobald neue Veranstaltungen dazukommen, werden sie hier angezeigt.</p>
              </div>
            </div>
          )}

          {dayPanelsWithQr.length > 0 && (
            <div className="grid h-full content-start gap-4 grid-cols-2 grid-rows-3 grid-flow-col">
              {dayPanelsWithQr.map((panel) => (
                <div key={panel.dateKey} className="flex gap-4 rounded-3xl border border-white/70 bg-white/70 px-4 py-4 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="tv-body font-semibold text-neutral-900">
                      {panel.date.toLocaleDateString('de-DE', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {(() => {
                        const relativeDate = getRelativeDateText(panel.date, today)
                        return (
                          relativeDate && <span className="ml-2 tv-small font-normal text-neutral-500">({relativeDate})</span>
                        )
                      })()}
                    </p>

                    <div className="mt-2 space-y-2">
                      {panel.events.map((event) => {
                        const timeRange = formatTimeRange({
                          startTime: event.startTime,
                          endTime: event.endTime,
                          isAllDay: event.isAllDay,
                          isMultiDay: event.isMultiDay,
                        })
                        let detailParts = [event.matchType, event.location].filter(Boolean) as string[]
                        const isHighlighted = isImportantEvent(event, today)

                        if (event.source === 'app') {
                          if (detailParts.length > 0) {
                            detailParts.splice(-1, 0, 'Anmeldungen via App')
                          } else {
                            detailParts.push('Anmeldungen via App')
                          }
                        }

                        if (event.source === 'tournament') {
                          detailParts = ['Turnier', event.dateLabel, event.location].filter(Boolean) as string[]
                        }

                        return (
                          <div key={event.id} className="rounded-lg px-2 py-1 tv-small text-neutral-700">
                            <div className="flex items-start gap-2">
                              {timeRange && (
                                <span className="w-28 shrink-0 whitespace-nowrap tv-meta font-semibold tracking-wide text-neutral-500">
                                  {timeRange}
                                </span>
                              )}
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                <div className="min-w-0 flex-1">
                                  {event.source === 'match' && event.groupName ? (
                                    <>
                                      <span className="block font-medium text-neutral-900 line-clamp-1">{event.groupName}</span>
                                      <span className="block font-medium text-neutral-900 line-clamp-1">
                                        {event.title.startsWith(`${event.groupName}:`)
                                          ? event.title.slice(event.groupName.length + 1).trim()
                                          : event.title}
                                      </span>
                                    </>
                                  ) : (
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="block font-medium text-neutral-900 line-clamp-1">{event.title}</span>
                                      {isHighlighted && <StarBadge />}
                                    </div>
                                  )}
                                  {detailParts.length > 0 && (
                                    <div className="mt-0.5 flex flex-wrap items-center tv-meta text-neutral-500">
                                      {detailParts.map((part, index) => (
                                        <span key={`${event.id}-detail-${index}`} className="flex items-center">
                                          {index > 0 && <span className="mx-2">&nbsp;</span>}
                                          {index === detailParts.length - 1 && event.location && (
                                            <LocationPin className="mr-[0.5] h-3 w-3 text-neutral-400" />
                                          )}
                                          {part}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {event.source !== 'match' && (
                                    <p className="mt-1 tv-meta text-neutral-500 line-clamp-3">{event.description}</p>
                                  )}
                                </div>
                                {event.source === 'app' && event.imageUrl && (
                                  <Image
                                    src={event.imageUrl}
                                    alt=""
                                    width={48}
                                    height={48}
                                    className="h-12 w-12 shrink-0 rounded-md border border-white/70 bg-white object-cover"
                                    unoptimized
                                  />
                                )}
                                {event.source === 'match' && event.groupUrl && 'groupQrCode' in event && event.groupQrCode && (
                                  <QrCode linkUrl={event.groupUrl} qrCodeDataUrl={event.groupQrCode} label="Gruppe" size="small" />
                                )}
                                {event.source === 'tournament' && (event.registrationUrl || event.callForEntriesUrl) && (
                                  <div className="flex shrink-0 gap-3">
                                    {'callForEntriesQrCode' in event && event.callForEntriesQrCode && event.callForEntriesUrl && (
                                      <QrCode
                                        linkUrl={event.callForEntriesUrl}
                                        qrCodeDataUrl={event.callForEntriesQrCode}
                                        label="Ausschreibung"
                                        size="small"
                                      />
                                    )}
                                    {'registrationQrCode' in event && event.registrationQrCode && event.registrationUrl && (
                                      <QrCode
                                        linkUrl={event.registrationUrl}
                                        qrCodeDataUrl={event.registrationQrCode}
                                        label="Anmeldung"
                                        size="small"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {panel.overflow > 0 && <p className="tv-meta text-neutral-400">{`+${panel.overflow} …`}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <ScreenAutoAdvance currentUrl={SCREEN_URL} nextIndex={nextIndex} duration={duration} />
      </div>
    </TvScreenLayout>
  )
}
