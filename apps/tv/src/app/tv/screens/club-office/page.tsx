import { CourtStatusMap, EmailAddress, PhoneNumber, QrCode, ScreenAutoAdvance, TvScreenLayout } from '@/components/tv'
import { fetchAreaMapSvg } from '@/lib/directus/fetchAreaMapSvg'
import {
  fetchCourtStatusData,
  fetchGlobals,
  fetchOfficeData,
  generateQrCodeForView,
  getNextScreenIndex,
} from '@/lib/tv'

const SCREEN_URL = '/tv/screens/club-office'
const SCREEN_TITLE = 'Geschäftsstelle'
const SCREEN_DURATION = 15000

// Map English day names to German
const dayNameMap: Record<string, string> = {
  monday: 'Montag',
  tuesday: 'Dienstag',
  wednesday: 'Mittwoch',
  thursday: 'Donnerstag',
  friday: 'Freitag',
  saturday: 'Samstag',
  sunday: 'Sonntag',
}

// Format time string (remove seconds)
const formatTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':')
  return `${hours}:${minutes}`
}

export default async function ClubOfficePage() {
  const [office, globals, courtStatus] = await Promise.all([
    fetchOfficeData(),
    fetchGlobals(),
    fetchCourtStatusData(),
  ])
  const nextIndex = getNextScreenIndex(SCREEN_URL)

  const showCourtStatus = !office.announcement
  const courtStatusSvg = showCourtStatus && courtStatus.areaMapId ? await fetchAreaMapSvg(courtStatus.areaMapId) : null

  // Generate QR codes
  const qrSchnuppern = await generateQrCodeForView('https://tc-waiblingen.de/schnuppern', 'large')
  const qrMitglied = await generateQrCodeForView('https://tc-waiblingen.de/mitglied-werden', 'large')
  const qrPortal = await generateQrCodeForView('https://ebusy.tc-waiblingen.de/', 'large')

  const badgeColor = office.badgeType === 'closed' ? 'bg-red-600' : 'bg-green-600'
  const badgeText = office.badgeType === 'closed' ? 'HEUTE AUSNAHMSWEISE NICHT GEÖFFNET' : 'HEUTE GEÖFFNET'

  return (
    <TvScreenLayout title={SCREEN_TITLE} duration={SCREEN_DURATION}>
      <div className="relative h-screen overflow-hidden">
        <div className="relative z-10 h-full px-16 pb-10 pt-44">
          <div className="grid h-full content-center gap-8 grid-cols-2 grid-rows-2">
            {/* Opening Hours Card */}
            <div className="relative flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/70 px-6 py-5 shadow-sm">
              {/* Badge in top-right corner */}
              {office.showBadge && (
                <div className={`absolute -right-2 -top-2 rotate-[12deg] ${badgeColor}`}>
                  <div className="max-w-[180px] px-5 py-1.5 shadow-lg">
                    <span className="block text-center tv-small font-bold leading-tight tracking-wide text-white">{badgeText}</span>
                  </div>
                </div>
              )}

              <h3 className="tv-heading font-semibold text-neutral-900">Öffnungszeiten</h3>

              <div className="mt-4 space-y-3 tv-body text-neutral-700">
                {office.hours.map((hourEntry, index) => (
                  <div key={index} className="flex gap-4">
                    <span className="w-28 font-medium">{dayNameMap[hourEntry.day]}</span>
                    <span>
                      {formatTime(hourEntry.starts_at)} – {formatTime(hourEntry.ends_at)} Uhr
                    </span>
                  </div>
                ))}
              </div>

              {office.closingDays.length > 0 && (
                <div className="mt-4 text-base text-red-700">
                  <span className="font-medium">Ausnahmsweise geschlossen:</span> {office.closingDays.join(', ')}
                </div>
              )}

              <div className="mt-6 space-y-2 border-t border-neutral-300 pt-4 text-base text-neutral-600">
                <PhoneNumber phone={globals.phone} />
                <EmailAddress email={globals.email} />
              </div>
            </div>

            {/* Special Announcements Card — Court Status fills this slot when there is no announcement */}
            {office.announcement ? (
              <div className="flex flex-col gap-3 rounded-3xl border border-amber-500/70 bg-amber-50/90 px-6 py-5 shadow-sm">
                <div className="tv-message leading-relaxed">{office.announcement.message}</div>
              </div>
            ) : courtStatusSvg ? (
              <div className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-3xl border border-white/70 bg-white/70 px-6 py-5 shadow-sm">
                <h3 className="shrink-0 tv-heading font-semibold text-neutral-900">Platzbelegung</h3>
                <div className="relative min-h-0 flex-1">
                  <CourtStatusMap svg={courtStatusSvg} courts={courtStatus.courts} size="compact" />
                </div>
              </div>
            ) : (
              <div></div>
            )}

            {/* Membership Registration Card */}
            <div className="flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/70 px-6 py-5 shadow-sm">
              <h3 className="tv-heading font-semibold text-neutral-900">Mitglied werden</h3>

              <p className="mt-2 text-lg leading-relaxed text-neutral-700">
                Werden Sie Teil unserer Tennisfamilie! Informationen zur Mitgliedschaft und Anmeldeformulare erhalten Sie in
                unserer Geschäftsstelle oder auf unserer Web-Seite. Der Einstieg gelingt am besten über ein Schnuppertraining.
              </p>

              {/* QR Codes */}
              <div className="mt-4 flex justify-center gap-24">
                {qrSchnuppern && (
                  <QrCode
                    linkUrl="https://tc-waiblingen.de/schnuppern"
                    qrCodeDataUrl={qrSchnuppern}
                    label="Schnuppertraining"
                    size="large"
                  />
                )}
                {qrMitglied && (
                  <QrCode
                    linkUrl="https://tc-waiblingen.de/mitglied-werden"
                    qrCodeDataUrl={qrMitglied}
                    label="Mitgliedsantrag"
                    size="large"
                  />
                )}
              </div>
            </div>

            {/* Member Self-Management Card */}
            <div className="flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/70 px-6 py-5 shadow-sm">
              <h3 className="tv-heading font-semibold text-neutral-900">Für Mitglieder</h3>

              <p className="mt-2 text-lg leading-relaxed text-neutral-700">
                Verwalten Sie Ihre Mitgliedschaft online (Adresse ändern, Beiträge einsehen, Plätze buchen) bei eBuSy.
              </p>

              <p className="mt-2 text-lg leading-relaxed text-neutral-700">
                Zum Ändern Ihrer Daten melden Sie sich zuerst in eBuSy an und klicken anschließend oben rechts auf Ihre
                E-Mail-Adresse. Es öffnet sich ein Menü, welches Sie zu den weiteren Inhalten führt. Vergessene Zugangsdaten
                bekommen Sie in der Geschäftsstelle.
              </p>

              {/* QR Code */}
              <div className="mt-4 flex justify-center">
                {qrPortal && (
                  <QrCode linkUrl="https://ebusy.de/tc-waiblingen" qrCodeDataUrl={qrPortal} label="eBuSy" size="large" />
                )}
              </div>
            </div>
          </div>
        </div>

        <ScreenAutoAdvance currentUrl={SCREEN_URL} nextIndex={nextIndex} duration={SCREEN_DURATION} />
      </div>
    </TvScreenLayout>
  )
}
