import { describe, expect, it } from 'vitest'
import { eventActiveDays } from '../active-days'
import type { CalendarEvent } from '../types'

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: '1',
    source: 'tournament',
    title: 'Turnier',
    description: null,
    location: null,
    startDate: new Date(2026, 1, 21),
    endDate: null,
    startTime: null,
    endTime: null,
    isAllDay: true,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: {},
    displayWeight: 2,
    ...overrides,
  }
}

function keys(dates: Date[]): string[] {
  return dates.map(
    (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  )
}

describe('eventActiveDays', () => {
  it('returns a single-day event as just its startDate', () => {
    const event = makeEvent({ startDate: new Date(2026, 4, 10) })
    expect(keys(eventActiveDays(event))).toEqual(['2026-05-10'])
  })

  it('enumerates [startDate, endDate] for multi-day events without playDates', () => {
    const event = makeEvent({
      startDate: new Date(2026, 2, 10),
      endDate: new Date(2026, 2, 13),
      isMultiDay: true,
    })
    expect(keys(eventActiveDays(event))).toEqual([
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
    ])
  })

  it('prefers playDates over the range when both are set', () => {
    const event = makeEvent({
      startDate: new Date(2026, 1, 21),
      endDate: new Date(2026, 2, 8),
      isMultiDay: true,
      playDates: [
        new Date(2026, 1, 21),
        new Date(2026, 1, 22),
        new Date(2026, 2, 7),
        new Date(2026, 2, 8),
      ],
    })
    expect(keys(eventActiveDays(event))).toEqual([
      '2026-02-21',
      '2026-02-22',
      '2026-03-07',
      '2026-03-08',
    ])
  })

  it('falls back to the range when playDates is an empty array', () => {
    const event = makeEvent({
      startDate: new Date(2026, 2, 10),
      endDate: new Date(2026, 2, 11),
      isMultiDay: true,
      playDates: [],
    })
    expect(keys(eventActiveDays(event))).toEqual(['2026-03-10', '2026-03-11'])
  })
})
