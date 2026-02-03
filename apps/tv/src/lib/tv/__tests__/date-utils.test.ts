import { describe, expect, it } from 'vitest'
import { formatTimeRange } from '../date-utils'

describe('formatTimeRange', () => {
  it('returns "Ganztägig" for single-day all-day events', () => {
    const result = formatTimeRange({
      startTime: null,
      endTime: null,
      isAllDay: true,
      isMultiDay: false,
    })

    expect(result).toBe('Ganztägig')
  })

  it('returns "Mehrtägig" for multi-day all-day events', () => {
    const result = formatTimeRange({
      startTime: null,
      endTime: null,
      isAllDay: true,
      isMultiDay: true,
    })

    expect(result).toBe('Mehrtägig')
  })

  it('returns "Ganztägig" when isMultiDay is undefined', () => {
    const result = formatTimeRange({
      startTime: null,
      endTime: null,
      isAllDay: true,
    })

    expect(result).toBe('Ganztägig')
  })

  it('returns time range for timed events', () => {
    const result = formatTimeRange({
      startTime: '09:00',
      endTime: '17:00',
      isAllDay: false,
    })

    expect(result).toBe('09:00 – 17:00 Uhr')
  })

  it('returns start time only when no end time', () => {
    const result = formatTimeRange({
      startTime: '14:00',
      endTime: null,
      isAllDay: false,
    })

    expect(result).toBe('14:00 Uhr')
  })

  it('returns null when no times and not all-day', () => {
    const result = formatTimeRange({
      startTime: null,
      endTime: null,
      isAllDay: false,
    })

    expect(result).toBeNull()
  })
})
