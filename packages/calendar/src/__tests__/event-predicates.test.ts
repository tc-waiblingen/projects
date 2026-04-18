import { describe, it, expect } from 'vitest'
import { isTournamentEvent } from '../event-predicates'
import type {
  AppEventMetadata,
  CalendarEvent,
  ClubEventMetadata,
  MatchEventMetadata,
  TournamentEventMetadata,
} from '../types'

function makeEvent(
  source: CalendarEvent['source'],
  metadata: CalendarEvent['metadata'],
): CalendarEvent {
  return {
    id: 'e1',
    source,
    title: 'Event',
    description: null,
    location: null,
    startDate: new Date(2026, 4, 1),
    endDate: null,
    startTime: null,
    endTime: null,
    isAllDay: true,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata,
    displayWeight: 2,
  }
}

describe('isTournamentEvent', () => {
  it('returns true for source "tournament" regardless of metadata', () => {
    const tournamentMeta: TournamentEventMetadata = {}
    expect(isTournamentEvent(makeEvent('tournament', tournamentMeta))).toBe(true)
  })

  it('returns true for club events with category "tournament"', () => {
    const meta: ClubEventMetadata = {
      important: false,
      showOnTv: false,
      category: 'tournament',
    }
    expect(isTournamentEvent(makeEvent('club', meta))).toBe(true)
  })

  it('returns false for club events with category "beginners" or "children"', () => {
    const beginners: ClubEventMetadata = { important: false, showOnTv: false, category: 'beginners' }
    const children: ClubEventMetadata = { important: false, showOnTv: false, category: 'children' }
    expect(isTournamentEvent(makeEvent('club', beginners))).toBe(false)
    expect(isTournamentEvent(makeEvent('club', children))).toBe(false)
  })

  it('returns false for club events with no category', () => {
    const meta: ClubEventMetadata = { important: false, showOnTv: false, category: null }
    expect(isTournamentEvent(makeEvent('club', meta))).toBe(false)
    const noCat: ClubEventMetadata = { important: false, showOnTv: false }
    expect(isTournamentEvent(makeEvent('club', noCat))).toBe(false)
  })

  it('returns false for match and app events', () => {
    const matchMeta: MatchEventMetadata = { homeTeam: 'A', awayTeam: 'B', isHome: true }
    const appMeta: AppEventMetadata = { uid: 'u' }
    expect(isTournamentEvent(makeEvent('match', matchMeta))).toBe(false)
    expect(isTournamentEvent(makeEvent('app', appMeta))).toBe(false)
  })
})
