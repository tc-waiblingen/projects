import type { EbusyReservation } from './types'

export interface CourtStatusResult {
  busy: boolean
  currentEndsAt?: string // "HH:mm"
}

/**
 * Parse an eBuSy "dd.mm.yyyy" date and "HH:mm" time into a JS Date.
 * eBuSy returns booking dates in local time without a timezone; we interpret
 * them in the server's local timezone (which the TV app's host runs in CET/CEST).
 */
function parseEbusyDateTime(dateDdMmYyyy: string, timeHhMm: string): Date | null {
  const dateMatch = dateDdMmYyyy.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  const timeMatch = timeHhMm.match(/^(\d{2}):(\d{2})$/)
  if (!dateMatch || !timeMatch) return null
  const [, dd, mm, yyyy] = dateMatch
  const [, hh, mi] = timeMatch
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), 0, 0)
}

interface ParsedReservation {
  start: Date
  end: Date
  endLabel: string
}

/**
 * Given a list of reservations for a single court and the current time,
 * determine whether the court is currently busy. If so, chain consecutive
 * back-to-back bookings (where the next one starts exactly when the
 * previous one ends) and return the end time of the final booking in that
 * chain — so a 10–11 + 11–12 + 12–13 run reports "bis 13:00" while the
 * court is in use.
 *
 * Cancelled reservations are ignored. BLOCKING reservations (e.g.
 * maintenance) count as busy.
 */
export function computeCourtStatus(reservations: EbusyReservation[], now: Date): CourtStatusResult {
  const parsed: ParsedReservation[] = []
  for (const res of reservations) {
    if (res.cancelled) continue
    const start = parseEbusyDateTime(res.date, res.fromTime)
    const end = parseEbusyDateTime(res.date, res.toTime)
    if (!start || !end) continue
    parsed.push({ start, end, endLabel: res.toTime })
  }
  parsed.sort((a, b) => a.start.getTime() - b.start.getTime())

  const current = parsed.find((p) => p.start.getTime() <= now.getTime() && now.getTime() < p.end.getTime())
  if (!current) return { busy: false }

  let tail = current
  while (true) {
    const nextBack = parsed.find((p) => p.start.getTime() === tail.end.getTime())
    if (!nextBack) break
    tail = nextBack
  }

  return { busy: true, currentEndsAt: tail.endLabel }
}
