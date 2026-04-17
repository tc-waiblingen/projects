import { DAY_NAME_LONG_DE, fetchOfficeData, formatTime, type DayName } from '@/lib/tv'

export async function OfficeFooter() {
  const office = await fetchOfficeData()

  const parts = office.hours.map(
    (h) => `${DAY_NAME_LONG_DE[h.day as DayName]} ${formatTime(h.starts_at)}–${formatTime(h.ends_at)} Uhr`,
  )

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-tcw-accent-200/70 bg-white px-8 py-3 text-center">
      <p className="tv-body">
        <span className="font-semibold">Öffnungszeiten der Geschäftsstelle:</span> {parts.join(', ')}
      </p>
    </footer>
  )
}
