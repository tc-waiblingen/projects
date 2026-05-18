import { DAY_NAME_LONG_DE, fetchOfficeData, formatTime, type DayName } from '@/lib/tv'

function ClosingNote({ closingDays }: { closingDays: string[] }) {
  if (closingDays.length === 0) return null

  if (closingDays.length === 1) {
    const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const text =
      closingDays[0] === today
        ? 'Heute ausnahmsweise geschlossen.'
        : `Am ${closingDays[0]} ausnahmsweise geschlossen.`
    return <span className="text-red-700">{text}</span>
  }

  return (
    <span className="text-red-700">
      <span className="font-medium">Ausnahmsweise geschlossen:</span> {closingDays.join(', ')}
    </span>
  )
}

export async function OfficeFooter() {
  const office = await fetchOfficeData()

  const parts = office.hours.map(
    (h) => `${DAY_NAME_LONG_DE[h.day as DayName]} ${formatTime(h.starts_at)}–${formatTime(h.ends_at)} Uhr`,
  )

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-tcw-accent-200/70 bg-white px-8 py-3 text-center">
      <p className="tv-body">
        <span className="font-semibold">Öffnungszeiten der Geschäftsstelle:</span> {parts.join(', ')}
        {office.closingDays.length > 0 && (
          <>
            {' · '}
            <ClosingNote closingDays={office.closingDays} />
          </>
        )}
      </p>
    </footer>
  )
}
