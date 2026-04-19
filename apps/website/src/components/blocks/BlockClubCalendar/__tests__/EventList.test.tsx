import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventList } from '../EventList'
import type { CalendarEvent } from '@tcw/calendar'

function createEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: 'test-event',
    source: 'tournament',
    title: 'Test Event',
    description: null,
    location: null,
    startDate: new Date(2026, 1, 15), // Feb 15, 2026
    endDate: null,
    startTime: null,
    endTime: null,
    isAllDay: true,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: {},
    ...overrides,
  }
}

describe('EventList', () => {
  describe('multi-day event grouping', () => {
    it('shows single-day event only on its date', () => {
      const event = createEvent({
        id: 'single-day',
        title: 'Single Day Event',
        startDate: new Date(2026, 1, 15),
        endDate: null,
        isMultiDay: false,
      })

      render(<EventList events={[event]} />)

      // Event should appear once
      expect(screen.getAllByText('Single Day Event')).toHaveLength(1)
    })

    it('shows multi-day event on each day it spans', () => {
      const event = createEvent({
        id: 'multi-day',
        title: 'Multi Day Tournament',
        startDate: new Date(2026, 1, 15), // Feb 15
        endDate: new Date(2026, 1, 17), // Feb 17
        isMultiDay: true,
      })

      render(<EventList events={[event]} />)

      // Event should appear on Feb 15, 16, and 17 = 3 times
      expect(screen.getAllByText('Multi Day Tournament')).toHaveLength(3)
    })

    it('shows multi-day event spanning multiple months', () => {
      const event = createEvent({
        id: 'cross-month',
        title: 'Cross Month Event',
        startDate: new Date(2026, 0, 30), // Jan 30
        endDate: new Date(2026, 1, 2), // Feb 2
        isMultiDay: true,
      })

      render(<EventList events={[event]} />)

      // Event should appear on Jan 30, 31 and Feb 1, 2 = 4 times
      expect(screen.getAllByText('Cross Month Event')).toHaveLength(4)

      // Should have both month headers
      expect(screen.getByText('Januar 2026')).toBeInTheDocument()
      expect(screen.getByText('Februar 2026')).toBeInTheDocument()
    })

    it('does not expand event without endDate even if isMultiDay is true', () => {
      const event = createEvent({
        id: 'no-end',
        title: 'No End Date Event',
        startDate: new Date(2026, 1, 15),
        endDate: null,
        isMultiDay: true, // isMultiDay but no endDate
      })

      render(<EventList events={[event]} />)

      // Should only appear once since there's no endDate
      expect(screen.getAllByText('No End Date Event')).toHaveLength(1)
    })

    it('shows empty state when no events', () => {
      render(<EventList events={[]} />)

      expect(screen.getByText('Keine Termine vorhanden.')).toBeInTheDocument()
    })
  })

  describe('tournaments with explicit playDates', () => {
    it('shows the tournament only on its playDates, not on non-play days in the span', () => {
      // STS format: only Saturdays and Sundays in Feb 14 – Feb 22 = 4 play days.
      const event = createEvent({
        id: 'sts-cup',
        title: 'STS-Cup Damen 30',
        startDate: new Date(2026, 1, 14), // Feb 14 (Saturday)
        endDate: new Date(2026, 1, 22), // Feb 22 (Sunday)
        isMultiDay: true,
        playDates: [
          new Date(2026, 1, 14),
          new Date(2026, 1, 15),
          new Date(2026, 1, 21),
          new Date(2026, 1, 22),
        ],
      })

      render(<EventList events={[event]} />)

      expect(screen.getAllByText('STS-Cup Damen 30')).toHaveLength(4)
    })

    it('tournaments without playDates expand across every day in the span', () => {
      const event = createEvent({
        id: 'regular',
        title: 'Regular Tournament',
        startDate: new Date(2026, 1, 14), // Feb 14
        endDate: new Date(2026, 1, 22), // Feb 22
        isMultiDay: true,
      })

      render(<EventList events={[event]} />)

      // Should appear on all 9 days
      expect(screen.getAllByText('Regular Tournament')).toHaveLength(9)
    })
  })
})
