import { describe, expect, it } from 'vitest'
import { computeCourtStatus } from '../court-status'
import type { EbusyReservation } from '../types'

function res(partial: Partial<EbusyReservation>): EbusyReservation {
  return {
    id: 1,
    courtId: 1,
    date: '17.04.2026',
    fromTime: '10:00',
    toTime: '11:00',
    ...partial,
  }
}

describe('computeCourtStatus', () => {
  it('returns free with no reservations', () => {
    const now = new Date(2026, 3, 17, 14, 0)
    expect(computeCourtStatus([], now)).toEqual({ busy: false })
  })

  it('reports busy and end time during a single booking', () => {
    const now = new Date(2026, 3, 17, 10, 30)
    const result = computeCourtStatus([res({ fromTime: '10:00', toTime: '11:00' })], now)
    expect(result).toEqual({ busy: true, currentEndsAt: '11:00' })
  })

  it('returns free when only a future booking exists', () => {
    const now = new Date(2026, 3, 17, 9, 0)
    const result = computeCourtStatus([res({ fromTime: '10:00', toTime: '11:00' })], now)
    expect(result).toEqual({ busy: false })
  })

  it('chains back-to-back bookings and reports the end of the last one', () => {
    const now = new Date(2026, 3, 17, 10, 30)
    const result = computeCourtStatus(
      [
        res({ id: 1, fromTime: '10:00', toTime: '11:00' }),
        res({ id: 2, fromTime: '11:00', toTime: '12:00' }),
        res({ id: 3, fromTime: '12:00', toTime: '13:00' }),
      ],
      now,
    )
    expect(result).toEqual({ busy: true, currentEndsAt: '13:00' })
  })

  it('stops chaining when there is a gap between bookings', () => {
    const now = new Date(2026, 3, 17, 10, 30)
    const result = computeCourtStatus(
      [
        res({ id: 1, fromTime: '10:00', toTime: '11:00' }),
        res({ id: 2, fromTime: '11:30', toTime: '12:30' }),
      ],
      now,
    )
    expect(result).toEqual({ busy: true, currentEndsAt: '11:00' })
  })

  it('ignores cancelled reservations when chaining', () => {
    const now = new Date(2026, 3, 17, 10, 30)
    const result = computeCourtStatus(
      [
        res({ id: 1, fromTime: '10:00', toTime: '11:00' }),
        res({ id: 2, fromTime: '11:00', toTime: '12:00', cancelled: true }),
        res({ id: 3, fromTime: '12:00', toTime: '13:00' }),
      ],
      now,
    )
    expect(result).toEqual({ busy: true, currentEndsAt: '11:00' })
  })

  it('treats BLOCKING reservations as busy', () => {
    const now = new Date(2026, 3, 17, 10, 30)
    const result = computeCourtStatus(
      [res({ fromTime: '10:00', toTime: '11:00', type: 'BLOCKING' })],
      now,
    )
    expect(result).toEqual({ busy: true, currentEndsAt: '11:00' })
  })
})
