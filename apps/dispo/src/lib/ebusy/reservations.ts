import {
  formatEbusyDate,
  listCourtModuleReservations,
  listLiteModuleReservations,
  listModules,
} from '@tcw/ebusy'
import type { DispoCourt } from '../directus/courts'

export interface CourtBooking {
  fromMinutes: number
  toMinutes: number
  title: string | null
  bookingType: string | null
  blocking: boolean
}

/**
 * Plain serializable shape keyed by stringified court id, suitable for
 * passing from server to client components. Construct a typed Map in the
 * client via `bookingsFromRecord()`.
 */
export type BookingsByCourt = Record<string, CourtBooking[]>

export function bookingsFromRecord(record: BookingsByCourt): Map<number, CourtBooking[]> {
  const map = new Map<number, CourtBooking[]>()
  for (const [key, list] of Object.entries(record)) {
    const id = Number(key)
    if (!Number.isFinite(id)) continue
    map.set(id, list)
  }
  return map
}

// Revalidate ebusy data every 5 minutes. Bookings don't shift minute-to-minute
// and the page is force-dynamic anyway; this just caps API load.
const REVALIDATE_SECONDS = 300

function hhmmToMinutes(hhmm: string): number | null {
  const m = hhmm.match(/^(\d{2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return null
  return h * 60 + mi
}

export async function fetchEbusyReservationsForDate(
  date: Date,
  courts: DispoCourt[],
): Promise<BookingsByCourt> {
  const bookingsByEbusyId = new Map<string, CourtBooking[]>()
  const day = formatEbusyDate(date)

  const modules = await listModules(REVALIDATE_SECONDS)
  const relevant = modules.filter((m) => m.type === 'COURT' || m.type === 'LITE')

  const reservationsPerModule = await Promise.all(
    relevant.map(async (mod) => {
      const fetcher = mod.type === 'COURT' ? listCourtModuleReservations : listLiteModuleReservations
      return fetcher(mod.id, { fromDate: day, toDate: day }, REVALIDATE_SECONDS)
    }),
  )

  for (const list of reservationsPerModule) {
    for (const res of list) {
      if (res.cancelled) continue
      const from = hhmmToMinutes(res.fromTime)
      const to = hhmmToMinutes(res.toTime)
      if (from === null || to === null || to <= from) continue
      const key = String(res.courtId)
      const existing = bookingsByEbusyId.get(key) ?? []
      existing.push({
        fromMinutes: from,
        toMinutes: to,
        title: res.displayText?.trim() || null,
        bookingType: res.bookingTypeName?.trim() || null,
        blocking: res.type === 'BLOCKING',
      })
      bookingsByEbusyId.set(key, existing)
    }
  }

  const result: BookingsByCourt = {}
  for (const court of courts) {
    if (!court.ebusyId) continue
    const list = bookingsByEbusyId.get(court.ebusyId)
    if (!list || list.length === 0) continue
    list.sort((a, b) => a.fromMinutes - b.fromMinutes)
    result[String(court.id)] = list
  }
  return result
}
