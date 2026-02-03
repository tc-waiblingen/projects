import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { transformScheduleForTv, isImportantEvent } from '../schedule-transformer'
import type { CalendarEvent } from '@tcw/calendar'

function createMockEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'test-1',
    source: 'club',
    title: 'Test Event',
    description: null,
    location: null,
    startDate: new Date(),
    endDate: null,
    startTime: null,
    endTime: null,
    isAllDay: false,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: { important: false, showOnTv: true },
    ...overrides,
  }
}

describe('schedule-transformer', () => {
  describe('date grouping timezone handling', () => {
    beforeEach(() => {
      // Mock "today" to a fixed date for consistent testing
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2025, 0, 20, 12, 0, 0)) // Jan 20, 2025 noon
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('groups events by local date, not UTC date', () => {
      // This is the key test for the timezone bug fix.
      // Create a date at midnight local time (e.g., Jan 23, 2025 00:00:00).
      // In UTC+1 (Germany), this is Jan 22, 2025 23:00:00 UTC.
      // The old buggy code would group this under "2025-01-22" instead of "2025-01-23".
      const midnightLocal = new Date(2025, 0, 23, 0, 0, 0) // Jan 23, 2025 00:00:00 local

      const events: CalendarEvent[] = [
        createMockEvent({
          id: 'midnight-event',
          title: 'Midnight Event',
          startDate: midnightLocal,
          metadata: { important: false, showOnTv: true },
        }),
      ]

      const result = transformScheduleForTv(events)

      expect(result.hasEvents).toBe(true)
      expect(result.dayPanels).toHaveLength(1)
      // The dateKey should be the LOCAL date, not the UTC date
      expect(result.dayPanels[0]!.dateKey).toBe('2025-01-23')
    })

    it('groups multiple events on the same local date together', () => {
      // Events at different times on the same local date should be grouped together
      const events: CalendarEvent[] = [
        createMockEvent({
          id: 'event-1',
          title: 'Morning Event',
          startDate: new Date(2025, 0, 25, 9, 0, 0), // 9 AM
        }),
        createMockEvent({
          id: 'event-2',
          title: 'Evening Event',
          startDate: new Date(2025, 0, 25, 20, 0, 0), // 8 PM
        }),
      ]

      const result = transformScheduleForTv(events)

      expect(result.dayPanels).toHaveLength(1)
      expect(result.dayPanels[0]!.dateKey).toBe('2025-01-25')
      expect(result.dayPanels[0]!.events).toHaveLength(2)
    })

    it('separates events on different local dates', () => {
      const events: CalendarEvent[] = [
        createMockEvent({
          id: 'event-1',
          title: 'Day 1 Event',
          startDate: new Date(2025, 0, 23, 12, 0, 0),
        }),
        createMockEvent({
          id: 'event-2',
          title: 'Day 2 Event',
          startDate: new Date(2025, 0, 24, 12, 0, 0),
        }),
      ]

      const result = transformScheduleForTv(events)

      expect(result.dayPanels).toHaveLength(2)
      expect(result.dayPanels[0]!.dateKey).toBe('2025-01-23')
      expect(result.dayPanels[1]!.dateKey).toBe('2025-01-24')
    })

    it('handles events near midnight correctly (23:59 vs 00:01)', () => {
      // Events just before and after midnight should be on different days
      const events: CalendarEvent[] = [
        createMockEvent({
          id: 'late-night',
          title: 'Late Night Event',
          startDate: new Date(2025, 0, 22, 23, 59, 0), // Jan 22 at 23:59
        }),
        createMockEvent({
          id: 'early-morning',
          title: 'Early Morning Event',
          startDate: new Date(2025, 0, 23, 0, 1, 0), // Jan 23 at 00:01
        }),
      ]

      const result = transformScheduleForTv(events)

      expect(result.dayPanels).toHaveLength(2)
      expect(result.dayPanels[0]!.dateKey).toBe('2025-01-22')
      expect(result.dayPanels[0]!.events[0]!.title).toBe('Late Night Event')
      expect(result.dayPanels[1]!.dateKey).toBe('2025-01-23')
      expect(result.dayPanels[1]!.events[0]!.title).toBe('Early Morning Event')
    })

    it('formats single-digit months and days with leading zeros', () => {
      // Use future dates relative to mocked "today" (Jan 20, 2025)
      const events: CalendarEvent[] = [
        createMockEvent({
          id: 'event-1',
          startDate: new Date(2025, 1, 5, 12, 0, 0), // Feb 5 (month 1, day 5)
        }),
        createMockEvent({
          id: 'event-2',
          startDate: new Date(2025, 8, 9, 12, 0, 0), // Sep 9 (month 8, day 9)
        }),
      ]

      const result = transformScheduleForTv(events)

      expect(result.dayPanels[0]!.dateKey).toBe('2025-02-05')
      expect(result.dayPanels[1]!.dateKey).toBe('2025-09-09')
    })
  })

  describe('transformScheduleForTv', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2025, 0, 20, 12, 0, 0))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns empty result when no events', () => {
      const result = transformScheduleForTv([])

      expect(result.hasEvents).toBe(false)
      expect(result.dayPanels).toHaveLength(0)
    })

    it('filters out past events', () => {
      const events: CalendarEvent[] = [
        createMockEvent({
          id: 'past',
          startDate: new Date(2025, 0, 19, 12, 0, 0), // Yesterday
        }),
        createMockEvent({
          id: 'future',
          startDate: new Date(2025, 0, 21, 12, 0, 0), // Tomorrow
        }),
      ]

      const result = transformScheduleForTv(events)

      expect(result.dayPanels).toHaveLength(1)
      expect(result.dayPanels[0]!.events[0]!.id).toBe('future')
    })

    it('includes events from today', () => {
      const events: CalendarEvent[] = [
        createMockEvent({
          id: 'today',
          startDate: new Date(2025, 0, 20, 18, 0, 0), // Today evening
        }),
      ]

      const result = transformScheduleForTv(events)

      expect(result.dayPanels).toHaveLength(1)
      expect(result.dayPanels[0]!.events[0]!.id).toBe('today')
    })

    it('limits to maximum of 2 events per day', () => {
      const events: CalendarEvent[] = [
        createMockEvent({ id: 'e1', startDate: new Date(2025, 0, 21, 9, 0, 0) }),
        createMockEvent({ id: 'e2', startDate: new Date(2025, 0, 21, 12, 0, 0) }),
        createMockEvent({ id: 'e3', startDate: new Date(2025, 0, 21, 15, 0, 0) }),
        createMockEvent({ id: 'e4', startDate: new Date(2025, 0, 21, 18, 0, 0) }),
      ]

      const result = transformScheduleForTv(events)

      expect(result.dayPanels[0]!.events).toHaveLength(2)
      expect(result.dayPanels[0]!.overflow).toBe(2)
    })

    it('limits to maximum of 6 day panels', () => {
      const events: CalendarEvent[] = Array.from({ length: 10 }, (_, i) =>
        createMockEvent({
          id: `event-${i}`,
          startDate: new Date(2025, 0, 21 + i, 12, 0, 0),
        })
      )

      const result = transformScheduleForTv(events)

      expect(result.dayPanels.length).toBeLessThanOrEqual(6)
    })

    it('sorts events within a day by start time', () => {
      const events: CalendarEvent[] = [
        createMockEvent({ id: 'late', title: 'Late', startDate: new Date(2025, 0, 21, 18, 0, 0) }),
        createMockEvent({ id: 'early', title: 'Early', startDate: new Date(2025, 0, 21, 9, 0, 0) }),
        createMockEvent({ id: 'mid', title: 'Mid', startDate: new Date(2025, 0, 21, 12, 0, 0) }),
      ]

      const result = transformScheduleForTv(events)

      expect(result.dayPanels[0]!.events[0]!.title).toBe('Early')
      expect(result.dayPanels[0]!.events[1]!.title).toBe('Mid')
    })
  })

  describe('multi-day tournament expansion', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2025, 0, 20, 12, 0, 0)) // Jan 20, 2025
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('expands multi-day tournaments to appear on each day', () => {
      const events: CalendarEvent[] = [
        createMockEvent({
          id: 'tournament-1',
          source: 'tournament',
          title: 'Winter Cup',
          startDate: new Date(2025, 0, 22, 9, 0, 0), // Jan 22
          endDate: new Date(2025, 0, 24, 18, 0, 0), // Jan 24
          isMultiDay: true,
          isAllDay: true,
          metadata: {
            category: 'open',
            registrationUrl: 'https://example.com/register',
          },
        }),
      ]

      const result = transformScheduleForTv(events)

      // Should have 3 day panels (Jan 22, 23, 24)
      expect(result.dayPanels).toHaveLength(3)
      expect(result.dayPanels[0]!.dateKey).toBe('2025-01-22')
      expect(result.dayPanels[1]!.dateKey).toBe('2025-01-23')
      expect(result.dayPanels[2]!.dateKey).toBe('2025-01-24')

      // Each day should have the tournament event
      expect(result.dayPanels[0]!.events[0]!.title).toBe('Winter Cup')
      expect(result.dayPanels[1]!.events[0]!.title).toBe('Winter Cup')
      expect(result.dayPanels[2]!.events[0]!.title).toBe('Winter Cup')
    })

    it('preserves tournament date range in dateLabel for all expanded days', () => {
      const events: CalendarEvent[] = [
        createMockEvent({
          id: 'tournament-1',
          source: 'tournament',
          title: 'Multi-Day Tournament',
          startDate: new Date(2025, 0, 22, 9, 0, 0),
          endDate: new Date(2025, 0, 24, 18, 0, 0),
          isMultiDay: true,
          metadata: {},
        }),
      ]

      const result = transformScheduleForTv(events)

      // All expanded events should have the same dateLabel showing full range
      const dayLabels = result.dayPanels.map((p) => p.events[0]!.dateLabel)
      expect(dayLabels.every((label) => label === dayLabels[0])).toBe(true)
      // Should show the full date range (22.1. – 24.1.2025)
      expect(dayLabels[0]).toContain('22')
      expect(dayLabels[0]).toContain('24')
    })

    it('only shows future days of ongoing multi-day tournament', () => {
      // Tournament started yesterday, ends tomorrow
      const events: CalendarEvent[] = [
        createMockEvent({
          id: 'tournament-1',
          source: 'tournament',
          title: 'Ongoing Tournament',
          startDate: new Date(2025, 0, 19, 9, 0, 0), // Jan 19 (yesterday)
          endDate: new Date(2025, 0, 21, 18, 0, 0), // Jan 21 (tomorrow)
          isMultiDay: true,
          metadata: {},
        }),
      ]

      const result = transformScheduleForTv(events)

      // Should only show today (Jan 20) and tomorrow (Jan 21), not yesterday
      expect(result.dayPanels).toHaveLength(2)
      expect(result.dayPanels[0]!.dateKey).toBe('2025-01-20')
      expect(result.dayPanels[1]!.dateKey).toBe('2025-01-21')
    })

    it('does not expand single-day tournaments', () => {
      const events: CalendarEvent[] = [
        createMockEvent({
          id: 'tournament-1',
          source: 'tournament',
          title: 'One Day Tournament',
          startDate: new Date(2025, 0, 22, 9, 0, 0),
          endDate: null,
          isMultiDay: false,
          metadata: {},
        }),
      ]

      const result = transformScheduleForTv(events)

      expect(result.dayPanels).toHaveLength(1)
      expect(result.dayPanels[0]!.dateKey).toBe('2025-01-22')
    })

    it('does not expand multi-day non-tournament events', () => {
      const events: CalendarEvent[] = [
        createMockEvent({
          id: 'club-event-1',
          source: 'club',
          title: 'Multi-Day Club Event',
          startDate: new Date(2025, 0, 22, 9, 0, 0),
          endDate: new Date(2025, 0, 24, 18, 0, 0),
          isMultiDay: true,
          metadata: { important: false, showOnTv: true },
        }),
      ]

      const result = transformScheduleForTv(events)

      // Should only appear on start date, not expanded
      expect(result.dayPanels).toHaveLength(1)
      expect(result.dayPanels[0]!.dateKey).toBe('2025-01-22')
    })
  })

  describe('isImportantEvent', () => {
    const today = new Date(2025, 0, 20)

    it('returns true for club events marked as important', () => {
      const event = {
        id: 'club-1',
        source: 'club' as const,
        title: 'Important Club Event',
        description: null,
        location: null,
        startDate: new Date(2025, 0, 25),
        displayDate: new Date(2025, 0, 25),
        startTime: null,
        endTime: null,
        isAllDay: false,
        isMultiDay: false,
        important: true,
      }

      expect(isImportantEvent(event, today)).toBe(true)
    })

    it('returns false for club events not marked as important', () => {
      const event = {
        id: 'club-1',
        source: 'club' as const,
        title: 'Regular Club Event',
        description: null,
        location: null,
        startDate: new Date(2025, 0, 25),
        displayDate: new Date(2025, 0, 25),
        startTime: null,
        endTime: null,
        isAllDay: false,
        isMultiDay: false,
        important: false,
      }

      expect(isImportantEvent(event, today)).toBe(false)
    })

    it('returns true for app events in Wichtig category within cutoff', () => {
      const event = {
        id: 'app-1',
        source: 'app' as const,
        title: 'App Event',
        description: null,
        location: null,
        startDate: new Date(2025, 0, 25),
        displayDate: new Date(2025, 0, 25),
        startTime: null,
        endTime: null,
        isAllDay: false,
        isMultiDay: false,
        categories: ['Wichtig'],
      }

      expect(isImportantEvent(event, today)).toBe(true)
    })

    it('returns false for app events not in Wichtig category', () => {
      const event = {
        id: 'app-1',
        source: 'app' as const,
        title: 'App Event',
        description: null,
        location: null,
        startDate: new Date(2025, 0, 25),
        displayDate: new Date(2025, 0, 25),
        startTime: null,
        endTime: null,
        isAllDay: false,
        isMultiDay: false,
        categories: ['Veranstaltungen'],
      }

      expect(isImportantEvent(event, today)).toBe(false)
    })

    it('returns false for match events', () => {
      const event = {
        id: 'match-1',
        source: 'match' as const,
        title: 'Match Event',
        description: null,
        location: null,
        startDate: new Date(2025, 0, 25),
        displayDate: new Date(2025, 0, 25),
        startTime: null,
        endTime: null,
        isAllDay: false,
        isMultiDay: false,
      }

      expect(isImportantEvent(event, today)).toBe(false)
    })
  })
})
