import { describe, it, expect } from 'vitest'
import { groupEventsByMonth, groupUpcomingDays } from '../grouping'
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

describe('groupUpcomingDays', () => {
  const now = new Date(2026, 10, 17, 15, 0) // Tue Nov 17, 2026, 15:00

  it('groups events by start day, sorted by date and time', () => {
    const days = groupUpcomingDays(
      [
        makeEvent({ id: 'b', startDate: new Date(2026, 10, 21), startTime: '14:00' }),
        makeEvent({ id: 'c', startDate: new Date(2026, 10, 27), startTime: '19:30' }),
        makeEvent({ id: 'a', startDate: new Date(2026, 10, 21), startTime: '10:00' }),
      ],
      now,
      5,
    )

    expect(days.map((d) => d.dateKey)).toEqual(['2026-11-21', '2026-11-27'])
    expect(days[0]!.events.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('caps the number of days, not events', () => {
    const events = [18, 18, 18, 19, 20, 21].map((day, i) =>
      makeEvent({ id: String(i), startDate: new Date(2026, 10, day) }),
    )

    const days = groupUpcomingDays(events, now, 2)

    expect(days.map((d) => d.dateKey)).toEqual(['2026-11-18', '2026-11-19'])
    expect(days[0]!.events).toHaveLength(3)
  })

  it('keeps events from earlier today', () => {
    const days = groupUpcomingDays(
      [makeEvent({ startDate: new Date(2026, 10, 17, 9, 0), startTime: '09:00' })],
      now,
      5,
    )

    expect(days.map((d) => d.dateKey)).toEqual(['2026-11-17'])
  })

  it('drops events that ended before today', () => {
    const days = groupUpcomingDays(
      [
        makeEvent({ id: 'past', startDate: new Date(2026, 10, 16) }),
        makeEvent({
          id: 'past-multi',
          startDate: new Date(2026, 10, 10),
          endDate: new Date(2026, 10, 16),
          isMultiDay: true,
        }),
      ],
      now,
      5,
    )

    expect(days).toEqual([])
  })

  it('shows a multi-day event only on its start day', () => {
    const days = groupUpcomingDays(
      [
        makeEvent({
          startDate: new Date(2026, 11, 12),
          endDate: new Date(2026, 11, 13),
          isMultiDay: true,
        }),
      ],
      now,
      5,
    )

    expect(days.map((d) => d.dateKey)).toEqual(['2026-12-12'])
  })

  it('shows a running multi-day event on today', () => {
    const days = groupUpcomingDays(
      [
        makeEvent({
          startDate: new Date(2026, 10, 15),
          endDate: new Date(2026, 10, 19),
          isMultiDay: true,
        }),
      ],
      now,
      5,
    )

    expect(days.map((d) => d.dateKey)).toEqual(['2026-11-17'])
  })

  it('uses play dates to decide whether an event is still running', () => {
    const days = groupUpcomingDays(
      [
        makeEvent({
          id: 'running',
          source: 'tournament',
          startDate: new Date(2026, 10, 14),
          playDates: ['2026-11-14', '2026-11-21'],
        }),
        makeEvent({
          id: 'done',
          source: 'tournament',
          startDate: new Date(2026, 10, 7),
          playDates: ['2026-11-07', '2026-11-14'],
        }),
      ],
      now,
      5,
    )

    expect(days.map((d) => d.dateKey)).toEqual(['2026-11-17'])
    expect(days[0]!.events.map((e) => e.id)).toEqual(['running'])
  })
})
