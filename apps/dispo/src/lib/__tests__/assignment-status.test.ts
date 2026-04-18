import { describe, expect, it } from 'vitest'
import type { CalendarEvent, MatchEventMetadata } from '@tcw/calendar'
import { computeAssignmentStatusByDate } from '../assignment-status'

function matchEvent(
  id: string,
  dateKey: string,
  group: string,
  isHome = true,
): CalendarEvent {
  const [y, m, d] = dateKey.split('-').map(Number)
  const meta: MatchEventMetadata = {
    homeTeam: 'TCW 1',
    awayTeam: 'Opponent',
    league: group,
    leagueFull: group,
    group,
    isHome,
  }
  return {
    id,
    source: 'match',
    title: 'Match',
    description: null,
    location: null,
    startDate: new Date(y!, (m ?? 1) - 1, d ?? 1, 10, 0, 0),
    endDate: null,
    startTime: '10:00',
    endTime: null,
    isAllDay: false,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: meta,
    displayWeight: 1,
  }
}

function tournamentEvent(id: string, dateKey: string): CalendarEvent {
  const [y, m, d] = dateKey.split('-').map(Number)
  return {
    id,
    source: 'tournament',
    title: 'Vereinsmeisterschaft',
    description: null,
    location: null,
    startDate: new Date(y!, (m ?? 1) - 1, d ?? 1),
    endDate: null,
    startTime: null,
    endTime: null,
    isAllDay: true,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: {},
    displayWeight: 1,
  }
}

describe('computeAssignmentStatusByDate', () => {
  it('marks a day as "none" when every match has zero assignments', () => {
    const events = [matchEvent('m1', '2026-04-18', 'Bezirksliga')]
    const result = computeAssignmentStatusByDate(events, new Map())
    expect(result.get('2026-04-18')).toBe('none')
  })

  it('marks a day as "exact" when every match has exactly its needed courts', () => {
    const events = [
      matchEvent('m1', '2026-04-18', 'Bezirksliga'),
      matchEvent('m2', '2026-04-18', 'Kids-Staffel'),
    ]
    const assignments = new Map([
      ['m1', 3],
      ['m2', 2],
    ])
    const result = computeAssignmentStatusByDate(events, assignments)
    expect(result.get('2026-04-18')).toBe('exact')
  })

  it('marks a day as "over" when all matches are at or above need and at least one is above', () => {
    const events = [
      matchEvent('m1', '2026-04-18', 'Bezirksliga'),
      matchEvent('m2', '2026-04-18', 'Kids-Staffel'),
    ]
    const assignments = new Map([
      ['m1', 4],
      ['m2', 2],
    ])
    const result = computeAssignmentStatusByDate(events, assignments)
    expect(result.get('2026-04-18')).toBe('over')
  })

  it('marks as "partial" when one match is short even if another is over', () => {
    const events = [
      matchEvent('m1', '2026-04-18', 'Bezirksliga'),
      matchEvent('m2', '2026-04-18', 'Bezirksliga'),
    ]
    const assignments = new Map([
      ['m1', 4],
      ['m2', 1],
    ])
    const result = computeAssignmentStatusByDate(events, assignments)
    expect(result.get('2026-04-18')).toBe('partial')
  })

  it('marks as "partial" when one match has no assignments but total > 0', () => {
    const events = [
      matchEvent('m1', '2026-04-18', 'Bezirksliga'),
      matchEvent('m2', '2026-04-18', 'Bezirksliga'),
    ]
    const assignments = new Map([['m1', 3]])
    const result = computeAssignmentStatusByDate(events, assignments)
    expect(result.get('2026-04-18')).toBe('partial')
  })

  it('skips tournament-only days', () => {
    const events = [tournamentEvent('t1', '2026-06-10')]
    const result = computeAssignmentStatusByDate(events, new Map())
    expect(result.has('2026-06-10')).toBe(false)
  })

  it('skips days where a tournament is present alongside matches', () => {
    const events = [
      matchEvent('m1', '2026-06-10', 'Bezirksliga'),
      tournamentEvent('t1', '2026-06-10'),
    ]
    const assignments = new Map([['m1', 3]])
    const result = computeAssignmentStatusByDate(events, assignments)
    expect(result.has('2026-06-10')).toBe(false)
  })

  it('ignores away matches', () => {
    const events = [matchEvent('m1', '2026-04-18', 'Bezirksliga', false)]
    const result = computeAssignmentStatusByDate(events, new Map())
    expect(result.has('2026-04-18')).toBe(false)
  })

  it('does not create entries for days without home matches', () => {
    const result = computeAssignmentStatusByDate([], new Map())
    expect(result.size).toBe(0)
  })
})
