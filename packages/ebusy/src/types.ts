/**
 * Minimal TypeScript types for the subset of the eBuSy API we use.
 * See https://ebusy.tc-waiblingen.de/api (OpenAPI).
 */

export type EbusyModuleType = 'COURT' | 'LITE' | 'EVENT' | 'COURSE' | 'MEMBER'

export interface EbusyModule {
  id: number
  name: string
  displayName?: string
  type: EbusyModuleType
}

export interface EbusyReservation {
  id: number
  courtId: number
  date: string // "dd.mm.yyyy"
  fromTime: string // "HH:mm"
  toTime: string // "HH:mm"
  cancelled?: boolean
  type?: 'BOOKING' | 'BLOCKING'
  displayText?: string
  bookingTypeName?: string
}
