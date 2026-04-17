import { describe, it, expect } from 'vitest'
import {
  getCourtCount,
  getPlayerCount,
  getSeasonCourtType,
  getMatchCourtType,
  getHeatLevel,
  computeCourtUsage,
} from '../court-usage'
import type { CalendarEvent, MatchEventMetadata, TournamentEventMetadata } from '../types'

describe('getCourtCount', () => {
  it('returns 2 for league names containing "staffel" (case-insensitive)', () => {
    expect(getCourtCount('Herren 50 Staffel')).toBe(2)
    expect(getCourtCount('DAMEN STAFFEL')).toBe(2)
    expect(getCourtCount('Bezirksstaffel')).toBe(2)
  })

  it('returns 2 for league names containing "kids" (case-insensitive)', () => {
    expect(getCourtCount('Kids Cup')).toBe(2)
    expect(getCourtCount('KIDS')).toBe(2)
  })

  it('returns 2 for league names containing "talentiade" (case-insensitive)', () => {
    expect(getCourtCount('Talentiade U12')).toBe(2)
    expect(getCourtCount('talentiade')).toBe(2)
  })

  it('returns 3 for all other league names', () => {
    expect(getCourtCount('Herren')).toBe(3)
    expect(getCourtCount('Damen 40')).toBe(3)
    expect(getCourtCount('Junioren U18')).toBe(3)
  })
})

describe('getPlayerCount', () => {
  it('returns 8 for 2 courts', () => {
    expect(getPlayerCount(2)).toBe(8)
  })

  it('returns 12 for 3 courts', () => {
    expect(getPlayerCount(3)).toBe(12)
  })
})

describe('getSeasonCourtType', () => {
  it('returns tennis_indoor for winter dates (Sep 23 - Apr 30)', () => {
    expect(getSeasonCourtType(new Date(2026, 8, 23))).toBe('tennis_indoor')  // Sep 23
    expect(getSeasonCourtType(new Date(2026, 11, 15))).toBe('tennis_indoor') // Dec 15
    expect(getSeasonCourtType(new Date(2027, 0, 1))).toBe('tennis_indoor')   // Jan 1
    expect(getSeasonCourtType(new Date(2027, 3, 30))).toBe('tennis_indoor')  // Apr 30
  })

  it('returns tennis_outdoor for summer dates (May 1 - Sep 22)', () => {
    expect(getSeasonCourtType(new Date(2026, 4, 1))).toBe('tennis_outdoor')  // May 1
    expect(getSeasonCourtType(new Date(2026, 6, 15))).toBe('tennis_outdoor') // Jul 15
    expect(getSeasonCourtType(new Date(2026, 8, 22))).toBe('tennis_outdoor') // Sep 22
  })
})

describe('getMatchCourtType', () => {
  function meta(season: string | undefined): MatchEventMetadata {
    return {
      homeTeam: 'A',
      awayTeam: 'B',
      isHome: true,
      season,
    } as MatchEventMetadata
  }

  it('returns tennis_indoor when season contains "winter" (case-insensitive)', () => {
    expect(getMatchCourtType(meta('Winter 2026/27'))).toBe('tennis_indoor')
    expect(getMatchCourtType(meta('WINTER'))).toBe('tennis_indoor')
    expect(getMatchCourtType(meta('prewinter run'))).toBe('tennis_indoor')
  })

  it('returns tennis_outdoor when season does not contain "winter"', () => {
    expect(getMatchCourtType(meta('Sommer 2026'))).toBe('tennis_outdoor')
    expect(getMatchCourtType(meta('Summer'))).toBe('tennis_outdoor')
  })

  it('returns tennis_outdoor when season is missing', () => {
    expect(getMatchCourtType(meta(undefined))).toBe('tennis_outdoor')
  })
})

describe('getHeatLevel', () => {
  it('returns low when less than 33% of courts used', () => {
    expect(getHeatLevel(1, 7)).toBe('low')   // 14%
    expect(getHeatLevel(2, 7)).toBe('low')   // 28%
  })

  it('returns medium when 33-66% of courts used', () => {
    expect(getHeatLevel(3, 7)).toBe('medium') // 42%
    expect(getHeatLevel(4, 7)).toBe('medium') // 57%
  })

  it('returns high when more than 66% of courts used', () => {
    expect(getHeatLevel(5, 7)).toBe('high')  // 71%
    expect(getHeatLevel(7, 7)).toBe('high')  // 100%
  })
})

function makeMatchEvent(overrides: Partial<CalendarEvent> = {}, meta: Partial<MatchEventMetadata> = {}): CalendarEvent {
  return {
    id: '1',
    source: 'match',
    title: 'Match',
    description: null,
    location: null,
    startDate: new Date(2026, 9, 10),
    endDate: null,
    startTime: '14:00',
    endTime: '18:00',
    isAllDay: false,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: {
      homeTeam: 'TC Waiblingen',
      awayTeam: 'TC Stuttgart',
      league: 'Herren',
      isHome: true,
      ...meta,
    } as MatchEventMetadata,
    displayWeight: 2,
    ...overrides,
  }
}

function makeTournamentEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 't1',
    source: 'tournament',
    title: 'Vereinsmeisterschaften',
    description: null,
    location: null,
    startDate: new Date(2026, 10, 14),
    endDate: null,
    startTime: '09:00',
    endTime: '18:00',
    isAllDay: false,
    isMultiDay: false,
    url: null,
    imageUrl: null,
    metadata: {} as TournamentEventMetadata,
    displayWeight: 2,
    ...overrides,
  }
}

describe('computeCourtUsage', () => {
  const config = { indoorCourtCount: 4, outdoorCourtCount: 7, year: 2026 }

  function getMonth(result: ReturnType<typeof computeCourtUsage>, key: string) {
    return result.find((m) => m.monthKey === key)!
  }

  it('filters to only home matches', () => {
    const events = [
      makeMatchEvent({ id: 'home' }, { isHome: true }),
      makeMatchEvent({ id: 'away' }, { isHome: false }),
    ]
    const result = computeCourtUsage({ events, ...config })
    const day = getMonth(result, '2026-10').days[0]
    expect(day.pm.entries).toHaveLength(1)
    expect(day.pm.entries[0].opponent).toBe('TC Stuttgart')
  })

  it('groups matches into AM and PM by start time', () => {
    const events = [
      makeMatchEvent({ id: 'am', startTime: '10:00' }, { league: 'Herren' }),
      makeMatchEvent({ id: 'pm', startTime: '14:00' }, { league: 'Damen' }),
    ]
    const result = computeCourtUsage({ events, ...config })
    const day = getMonth(result, '2026-10').days[0]
    expect(day.am.entries).toHaveLength(1)
    expect(day.pm.entries).toHaveLength(1)
  })

  it('applies court count rules based on league name', () => {
    const events = [
      makeMatchEvent({ id: 'staffel', startTime: '14:00' }, { league: 'Herren 50 Staffel' }),
      makeMatchEvent({ id: 'normal', startTime: '14:00', startDate: new Date(2026, 9, 11) }, { league: 'Herren' }),
    ]
    const result = computeCourtUsage({ events, ...config })
    const oct = getMonth(result, '2026-10')
    const day1 = oct.days[0]
    expect(day1.pm.entries[0].courts).toBe(2)
    expect(day1.pm.entries[0].players).toBe(8)
    const day2 = oct.days[1]
    expect(day2.pm.entries[0].courts).toBe(3)
    expect(day2.pm.entries[0].players).toBe(12)
  })

  it('computes AM/PM court and team totals', () => {
    const events = [
      makeMatchEvent({ id: '1', startTime: '10:00' }, { league: 'Herren' }),
      makeMatchEvent({ id: '2', startTime: '14:00' }, { league: 'Herren 50 Staffel' }),
      makeMatchEvent({ id: '3', startTime: '15:00' }, { league: 'Damen 40' }),
    ]
    const result = computeCourtUsage({ events, ...config })
    const day = getMonth(result, '2026-10').days[0]
    expect(day.am.courts).toBe(3)
    expect(day.am.teams).toBe(1)
    expect(day.am.players).toBe(12)
    expect(day.pm.courts).toBe(5)
    expect(day.pm.teams).toBe(2)
    expect(day.pm.players).toBe(20)
  })

  it('handles tournaments — uses all courts for the season', () => {
    const events = [makeTournamentEvent()]
    const result = computeCourtUsage({ events, ...config })
    const day = getMonth(result, '2026-11').days[0]
    expect(day.tournament).not.toBeNull()
    expect(day.tournament!.courts).toBe(4)
    expect(day.heatLevel).toBe('high')
  })

  it('expands multi-day tournaments across all days', () => {
    const events = [makeTournamentEvent({
      startDate: new Date(2026, 10, 14), // Nov 14
      endDate: new Date(2026, 10, 16),   // Nov 16
      isMultiDay: true,
    })]
    const result = computeCourtUsage({ events, ...config })
    const month = result.find((m) => m.monthKey === '2026-11')!
    expect(month.days).toHaveLength(3)
    expect(month.days.map((d) => d.dateKey)).toEqual([
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
    ])
    for (const day of month.days) {
      expect(day.tournament).not.toBeNull()
      expect(day.tournament!.courts).toBe(4) // all indoor
      expect(day.heatLevel).toBe('high')
    }
  })

  it('assigns month court type based on calendar season', () => {
    const winterMatch = makeMatchEvent({ startDate: new Date(2026, 10, 5) })
    const summerMatch = makeMatchEvent({ id: '2', startDate: new Date(2026, 5, 15) })
    const result = computeCourtUsage({ events: [winterMatch, summerMatch], ...config })
    expect(result.find((m) => m.monthKey === '2026-11')!.courtType).toBe('tennis_indoor')
    expect(result.find((m) => m.monthKey === '2026-06')!.courtType).toBe('tennis_outdoor')
  })

  it('assigns day court type from match season metadata', () => {
    const winterMatch = makeMatchEvent(
      { id: 'w', startDate: new Date(2026, 5, 6) }, // Jun 6 — summer by date
      { season: 'Winter 2026/27' }
    )
    const summerMatch = makeMatchEvent(
      { id: 's', startDate: new Date(2026, 10, 7) }, // Nov 7 — winter by date
      { season: 'Sommer 2026' }
    )
    const missingSeason = makeMatchEvent(
      { id: 'x', startDate: new Date(2026, 10, 8) }, // Nov 8 — winter by date
      { season: undefined }
    )
    const result = computeCourtUsage({
      events: [winterMatch, summerMatch, missingSeason],
      ...config,
    })

    const jun = result.find((m) => m.monthKey === '2026-06')!
    expect(jun.days[0].courtType).toBe('tennis_indoor')
    expect(jun.days[0].totalCourtsAvailable).toBe(4)

    const nov = result.find((m) => m.monthKey === '2026-11')!
    const nov7 = nov.days.find((d) => d.dateKey === '2026-11-07')!
    const nov8 = nov.days.find((d) => d.dateKey === '2026-11-08')!
    expect(nov7.courtType).toBe('tennis_outdoor')
    expect(nov7.totalCourtsAvailable).toBe(7)
    expect(nov8.courtType).toBe('tennis_outdoor')
    expect(nov8.totalCourtsAvailable).toBe(7)
  })

  it('assigns heat level based on percentage of available courts', () => {
    const events = [
      makeMatchEvent(
        { startTime: '14:00' },
        { league: 'Herren', season: 'Winter 2026/27' }
      ),
    ]
    const result = computeCourtUsage({ events, ...config })
    const oct = result.find((m) => m.monthKey === '2026-10')!
    expect(oct.days[0].heatLevel).toBe('high')
  })

  it('ignores non-match, non-tournament events', () => {
    const clubEvent: CalendarEvent = {
      id: 'club1',
      source: 'club',
      title: 'Vereinsfest',
      description: null,
      location: null,
      startDate: new Date(2026, 9, 10),
      endDate: null,
      startTime: '14:00',
      endTime: null,
      isAllDay: false,
      isMultiDay: false,
      url: null,
      imageUrl: null,
      metadata: { important: false, showOnTv: false },
      displayWeight: 2,
    }
    const result = computeCourtUsage({ events: [clubEvent], ...config })
    expect(result).toHaveLength(12) // all months present
    expect(result.every((m) => m.days.length === 0)).toBe(true) // but no days with data
  })

  it('sorts entries by time within AM/PM groups', () => {
    const events = [
      makeMatchEvent({ id: '1', startTime: '15:00' }, { league: 'Damen' }),
      makeMatchEvent({ id: '2', startTime: '13:00' }, { league: 'Herren' }),
    ]
    const result = computeCourtUsage({ events, ...config })
    const pm = getMonth(result, '2026-10').days[0].pm
    expect(pm.entries[0].time).toBe('13:00')
    expect(pm.entries[1].time).toBe('15:00')
  })
})
