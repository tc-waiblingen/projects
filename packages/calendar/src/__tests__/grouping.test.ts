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
  describe('expandDays option', () => {
    const multiDayEvent = makeEvent({
      id: 'multi',
      title: 'Multi-Day Event',
      startDate: new Date(2025, 2, 10), // March 10
      endDate: new Date(2025, 2, 13), // March 13
      isMultiDay: true,
      isAllDay: true,
      expandDays: undefined,
    })

    it('expands multi-day events by default', () => {
      const result = groupEventsByMonth([multiDayEvent], {
        multiDayFilter: () => true,
      })

      expect(result).toHaveLength(1)
      expect(result[0].days).toHaveLength(4) // March 10, 11, 12, 13
      expect(result[0].days.map((d) => d.dateKey)).toEqual([
        '2025-03-10',
        '2025-03-11',
        '2025-03-12',
        '2025-03-13',
      ])
    })

    it('expands multi-day events when expandDays is true', () => {
      const result = groupEventsByMonth([multiDayEvent], {
        expandDays: true,
        multiDayFilter: () => true,
      })

      expect(result).toHaveLength(1)
      expect(result[0].days).toHaveLength(4)
    })

    it('does not expand multi-day events when expandDays is false', () => {
      const result = groupEventsByMonth([multiDayEvent], {
        expandDays: false,
      })

      expect(result).toHaveLength(1)
      expect(result[0].days).toHaveLength(1)
      expect(result[0].days[0].dateKey).toBe('2025-03-10')
      expect(result[0].days[0].events).toHaveLength(1)
      expect(result[0].days[0].events[0].id).toBe('multi')
    })

    it('respects per-event expandDays: false even when global expandDays is true', () => {
      const noExpandEvent = makeEvent({
        id: 'no-expand',
        title: 'No Expand Event',
        startDate: new Date(2025, 2, 10),
        endDate: new Date(2025, 2, 13),
        isMultiDay: true,
        isAllDay: true,
        expandDays: false,
      })

      const result = groupEventsByMonth([noExpandEvent], {
        expandDays: true,
        multiDayFilter: () => true,
      })

      expect(result).toHaveLength(1)
      expect(result[0].days).toHaveLength(1)
      expect(result[0].days[0].dateKey).toBe('2025-03-10')
    })

    it('still handles single-day events normally when expandDays is false', () => {
      const singleDayEvent = makeEvent({
        id: 'single',
        title: 'Single Day',
        startDate: new Date(2025, 2, 15),
      })

      const result = groupEventsByMonth([multiDayEvent, singleDayEvent], {
        expandDays: false,
      })

      expect(result).toHaveLength(1)
      expect(result[0].days).toHaveLength(2) // March 10 and March 15
    })
  })
})
