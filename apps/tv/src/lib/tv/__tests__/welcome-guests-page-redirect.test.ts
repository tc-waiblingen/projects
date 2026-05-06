import { describe, expect, it } from 'vitest'
import type { CalendarEvent, MatchEventMetadata, TournamentEventMetadata } from '@tcw/calendar'
import { transformWelcomeGuestsForTv } from '../welcome-guests-transformer'

function matchEvent(overrides: Partial<CalendarEvent> & { metadata?: Partial<MatchEventMetadata> }): CalendarEvent {
  const { metadata, ...rest } = overrides
  return {
    id: 'm-1',
    source: 'match',
    title: 'Home vs Guest',
    description: null,
    location: null,
    startDate: new Date(2026, 3, 20, 0, 0, 0),
    endDate: null,
    startTime: '14:00',
    endTime: null,
    isAllDay: false,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: {
      homeTeam: 'TC Waiblingen 1',
      awayTeam: 'TA TSG Backnang 2',
      isHome: true,
      teamName: 'Herren 1',
      ...metadata,
    } as MatchEventMetadata,
    displayWeight: 3,
    ...rest,
  }
}

function tournamentEvent(overrides: Partial<CalendarEvent> & { metadata?: Partial<TournamentEventMetadata> }): CalendarEvent {
  const { metadata, ...rest } = overrides
  return {
    id: 't-1',
    source: 'tournament',
    title: 'Frühjahrs-Cup',
    description: null,
    location: null,
    startDate: new Date(2026, 3, 20, 0, 0, 0),
    endDate: null,
    startTime: null,
    endTime: null,
    isAllDay: true,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: {
      tournamentUrl: 'https://nuliga.example/t/1',
      callForEntriesUrl: 'https://nuliga.example/t/1/ausschreibung',
      ...metadata,
    } as TournamentEventMetadata,
    displayWeight: 2,
    ...rest,
  }
}

describe('welcome-guests page redirect condition', () => {
  it('redirects to /tv when no matches and no tournament', () => {
    const now = new Date(2026, 3, 20, 23, 0, 0)
    const events: CalendarEvent[] = [
      matchEvent({ startDate: new Date(2026, 3, 20), startTime: '14:00' }),
    ]

    const data = transformWelcomeGuestsForTv(events, now)

    // This is the exact condition from the page:
    // if (data.matches.length === 0 && data.tournament == null) redirect('/tv')
    const shouldRedirect = data.matches.length === 0 && data.tournament == null
    expect(shouldRedirect).toBe(true)
  })

  it('does NOT redirect when matches exist', () => {
    const now = new Date(2026, 3, 20, 13, 0, 0)
    const events: CalendarEvent[] = [
      matchEvent({ startDate: new Date(2026, 3, 20), startTime: '14:00' }),
    ]

    const data = transformWelcomeGuestsForTv(events, now)

    const shouldRedirect = data.matches.length === 0 && data.tournament == null
    expect(shouldRedirect).toBe(false)
  })

  it('does NOT redirect when tournament exists (before noon)', () => {
    const now = new Date(2026, 3, 20, 9, 0, 0)
    const events: CalendarEvent[] = [
      tournamentEvent({ startDate: new Date(2026, 3, 20) }),
    ]

    const data = transformWelcomeGuestsForTv(events, now)

    const shouldRedirect = data.matches.length === 0 && data.tournament == null
    expect(shouldRedirect).toBe(false)
  })

  it('does NOT redirect when both matches and tournament exist', () => {
    const now = new Date(2026, 3, 20, 10, 0, 0)
    const events: CalendarEvent[] = [
      matchEvent({ startDate: new Date(2026, 3, 20), startTime: '11:00' }),
      tournamentEvent({ startDate: new Date(2026, 3, 20) }),
    ]

    const data = transformWelcomeGuestsForTv(events, now)

    const shouldRedirect = data.matches.length === 0 && data.tournament == null
    expect(shouldRedirect).toBe(false)
  })
})

describe('screen index clamping', () => {
  it('defaults to 0 when nextIndex is NaN', () => {
    const nextParam = 'abc'
    const nextIndex = nextParam !== null ? parseInt(nextParam, 10) : 0
    const screens = [{ url: '/a' }, { url: '/b' }]
    const screenIndex = isNaN(nextIndex) || nextIndex < 0 ? 0 : Math.min(nextIndex, screens.length - 1)
    expect(screenIndex).toBe(0)
  })

  it('defaults to 0 when nextIndex is negative', () => {
    const nextIndex = -1
    const screens = [{ url: '/a' }, { url: '/b' }]
    const screenIndex = isNaN(nextIndex) || nextIndex < 0 ? 0 : Math.min(nextIndex, screens.length - 1)
    expect(screenIndex).toBe(0)
  })

  it('clamps to last screen when nextIndex exceeds length', () => {
    const nextIndex = 99
    const screens = [{ url: '/a' }, { url: '/b' }, { url: '/c' }]
    const screenIndex = isNaN(nextIndex) || nextIndex < 0 ? 0 : Math.min(nextIndex, screens.length - 1)
    expect(screenIndex).toBe(2)
  })

  it('uses exact index when valid', () => {
    const nextIndex = 1
    const screens = [{ url: '/a' }, { url: '/b' }, { url: '/c' }]
    const screenIndex = isNaN(nextIndex) || nextIndex < 0 ? 0 : Math.min(nextIndex, screens.length - 1)
    expect(screenIndex).toBe(1)
  })

  it('defaults to 0 when nextParam is null', () => {
    const nextParam = null
    const nextIndex = nextParam !== null ? parseInt(nextParam, 10) : 0
    const screens = [{ url: '/a' }, { url: '/b' }]
    const screenIndex = isNaN(nextIndex) || nextIndex < 0 ? 0 : Math.min(nextIndex, screens.length - 1)
    expect(screenIndex).toBe(0)
  })
})
