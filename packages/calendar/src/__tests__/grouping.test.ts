import { describe, it, expect } from 'vitest'
import { groupEventsByMonth } from '../grouping'
import type { CalendarEvent } from '../types'

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: '1',
    source: 'club',
    title: 'Test Event',
    description: null,
    location: null,
    startDate: new Date(2025, 2, 10), // March 10
    endDate: null,
    startTime: null,
    endTime: null,
    isAllDay: false,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: {},
    displayWeight: 1,
    ...overrides,
  }
}

describe('groupEventsByMonth', () => {
  it('expands multi-day events across every day in the range', () => {
    const event = makeEvent({
      id: 'multi',
      title: 'Multi-Day Event',
      startDate: new Date(2025, 2, 10), // March 10
      endDate: new Date(2025, 2, 13), // March 13
      isMultiDay: true,
      isAllDay: true,
    })

    const result = groupEventsByMonth([event])
    expect(result).toHaveLength(1)
    expect(result[0].days.map((d) => d.dateKey)).toEqual([
      '2025-03-10',
      '2025-03-11',
      '2025-03-12',
      '2025-03-13',
    ])
  })

  it('pins multi-day events with expandDays=false to their startDate', () => {
    const event = makeEvent({
      id: 'no-expand',
      startDate: new Date(2025, 2, 10),
      endDate: new Date(2025, 2, 13),
      isMultiDay: true,
      isAllDay: true,
      expandDays: false,
    })

    const result = groupEventsByMonth([event])
    expect(result[0].days).toHaveLength(1)
    expect(result[0].days[0].dateKey).toBe('2025-03-10')
  })

  it('adds single-day events only to their startDate', () => {
    const event = makeEvent({ startDate: new Date(2025, 2, 15) })

    const result = groupEventsByMonth([event])
    expect(result[0].days).toHaveLength(1)
    expect(result[0].days[0].dateKey).toBe('2025-03-15')
  })

  it('honors playDates instead of enumerating startDate…endDate', () => {
    const stsEvent = makeEvent({
      id: 'sts',
      source: 'tournament',
      title: 'STS Damen',
      startDate: new Date(2026, 1, 21),
      endDate: new Date(2026, 2, 8),
      isMultiDay: true,
      isAllDay: true,
      playDates: [
        '2026-02-21',
        '2026-02-22',
        '2026-02-28',
        '2026-03-01',
        '2026-03-07',
        '2026-03-08',
      ],
    })

    const result = groupEventsByMonth([stsEvent])
    const allDays = result.flatMap((m) => m.days.map((d) => d.dateKey))
    expect(allDays).toEqual([
      '2026-02-21',
      '2026-02-22',
      '2026-02-28',
      '2026-03-01',
      '2026-03-07',
      '2026-03-08',
    ])
  })
})
