import { ebusyGet } from './ebusy-client'
import type { EbusyModule, EbusyReservation } from './types'

export function listModules(revalidateSeconds = 3600): Promise<EbusyModule[]> {
  return ebusyGet<EbusyModule[]>('/general/modules', {}, revalidateSeconds)
}

export interface ReservationDateRange {
  fromDate: string // "dd.mm.yy"
  toDate: string // "dd.mm.yy"
}

export function listCourtModuleReservations(
  moduleId: number,
  range: ReservationDateRange,
  revalidateSeconds: number,
): Promise<EbusyReservation[]> {
  return ebusyGet<EbusyReservation[]>(
    `/court/modules/${moduleId}/reservations`,
    { fromDate: range.fromDate, toDate: range.toDate },
    revalidateSeconds,
  )
}

export function listLiteModuleReservations(
  moduleId: number,
  range: ReservationDateRange,
  revalidateSeconds: number,
): Promise<EbusyReservation[]> {
  return ebusyGet<EbusyReservation[]>(
    `/lite/modules/${moduleId}/reservations`,
    { fromDate: range.fromDate, toDate: range.toDate },
    revalidateSeconds,
  )
}

/**
 * Format a JS Date as "dd.mm.yy" — the format eBuSy requires for the
 * fromDate/toDate query params.
 */
export function formatEbusyDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = String(date.getFullYear()).slice(-2)
  return `${d}.${m}.${y}`
}
