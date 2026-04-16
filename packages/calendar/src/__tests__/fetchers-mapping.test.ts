import { describe, expect, it } from 'vitest'
import { _testHelpers } from '../fetchers'
import type { NrMatch, NrTournament } from '../nr-client'
import type {
  MatchEventMetadata,
  TournamentEventMetadata,
} from '../types'

const { mapNrMatch, mapNrTournament, parseNrDateTime } = _testHelpers

function makeNrMatch(overrides: Partial<NrMatch> = {}): NrMatch {
  return {
    id: 'm1',
    teamId: 't1',
    clubId: 'tcw',
    season: 'Sommer 2026',
    league: 'Herren 40',
    matchDate: '2026-05-10',
    matchTime: '10:00',
    homeTeam: 'TC Waiblingen',
    awayTeam: 'TC Beispiel',
    isHome: true,
    lastRefreshedAt: '2026-04-14T00:00:00Z',
    ...overrides,
  }
}

function makeNrTournament(
  overrides: Partial<NrTournament> = {},
): NrTournament {
  return {
    id: 'trn1',
    clubId: 'tcw',
    title: 'Clubmeisterschaft',
    dateStart: '2026-07-01',
    lastRefreshedAt: '2026-04-14T00:00:00Z',
    ...overrides,
  }
}

describe('parseNrDateTime', () => {
  it('parses date-only as local midnight', () => {
    const result = parseNrDateTime('2026-05-10')
    expect(result).not.toBeNull()
    expect(result!.date).toBe('2026-05-10')
    expect(result!.time).toBeNull()
    expect(result!.jsDate.getFullYear()).toBe(2026)
    expect(result!.jsDate.getMonth()).toBe(4)
    expect(result!.jsDate.getDate()).toBe(10)
    expect(result!.jsDate.getHours()).toBe(0)
  })

  it('parses date plus HH:MM', () => {
    const result = parseNrDateTime('2026-05-10', '14:30')
    expect(result).not.toBeNull()
    expect(result!.time).toBe('14:30')
    expect(result!.jsDate.getHours()).toBe(14)
    expect(result!.jsDate.getMinutes()).toBe(30)
  })

  it('returns null on malformed date', () => {
    expect(parseNrDateTime('not-a-date')).toBeNull()
  })

  it('ignores malformed time', () => {
    const result = parseNrDateTime('2026-05-10', 'nope')
    expect(result!.time).toBeNull()
    expect(result!.jsDate.getHours()).toBe(0)
  })
})

describe('mapNrMatch', () => {
  it('maps a full home match with time and result', () => {
    const event = mapNrMatch(
      makeNrMatch({
        result: '6:3',
        location: 'TCW Halle',
        homeTeamUrl: 'https://example/home',
        awayTeamUrl: 'https://example/away',
        reportUrl: 'https://example/report',
        leagueFull: 'Herren 40 Verbandsliga',
        leagueUrl: 'https://example/league',
        district: 'Bezirk B',
      }),
    )
    expect(event).not.toBeNull()
    expect(event!.source).toBe('match')
    expect(event!.title).toBe(
      'Herren 40: TC Waiblingen vs. TC Beispiel',
    )
    expect(event!.location).toBe('TCW Halle')
    expect(event!.startTime).toBe('10:00')
    expect(event!.isAllDay).toBe(false)
    expect(event!.isMultiDay).toBe(false)
    expect(event!.expandDays).toBe(true)
    expect(event!.displayWeight).toBe(2)
    expect(event!.id).toBe('match-2026-05-10-TC-Waiblingen-TC-Beispiel')

    const meta = event!.metadata as MatchEventMetadata
    expect(meta.isHome).toBe(true)
    expect(meta.result).toBe('6:3')
    expect(meta.reportUrl).toBe('https://example/report')
    expect(meta.leagueFull).toBe('Herren 40 Verbandsliga')
    expect(meta.district).toBe('Bezirk B')
  })

  it('maps a match without time as all-day', () => {
    const event = mapNrMatch(
      makeNrMatch({ matchTime: undefined, result: undefined }),
    )
    expect(event!.startTime).toBeNull()
    expect(event!.isAllDay).toBe(true)
    const meta = event!.metadata as MatchEventMetadata
    expect(meta.result).toBeUndefined()
  })

  it('drops league prefix when league is empty', () => {
    const event = mapNrMatch(makeNrMatch({ league: '' }))
    expect(event!.title).toBe('TC Waiblingen vs. TC Beispiel')
    const meta = event!.metadata as MatchEventMetadata
    expect(meta.league).toBeUndefined()
  })

  it('returns null for unparseable date', () => {
    const event = mapNrMatch(makeNrMatch({ matchDate: 'bogus' }))
    expect(event).toBeNull()
  })

  it('marks away matches via metadata', () => {
    const event = mapNrMatch(makeNrMatch({ isHome: false }))
    const meta = event!.metadata as MatchEventMetadata
    expect(meta.isHome).toBe(false)
  })
})

describe('mapNrTournament', () => {
  it('maps a single-day tournament', () => {
    const event = mapNrTournament(makeNrTournament())
    expect(event!.source).toBe('tournament')
    expect(event!.title).toBe('Clubmeisterschaft')
    expect(event!.isAllDay).toBe(true)
    expect(event!.isMultiDay).toBe(false)
    expect(event!.endDate).toBeNull()
    expect(event!.displayWeight).toBe(2)
  })

  it('detects multi-day tournaments', () => {
    const event = mapNrTournament(
      makeNrTournament({ dateStart: '2026-07-01', dateEnd: '2026-07-03' }),
    )
    expect(event!.isMultiDay).toBe(true)
    expect(event!.endDate).not.toBeNull()
  })

  it('treats same-day end date as single-day', () => {
    const event = mapNrTournament(
      makeNrTournament({ dateStart: '2026-07-01', dateEnd: '2026-07-01' }),
    )
    expect(event!.isMultiDay).toBe(false)
  })

  it('builds description from registrationDeadline', () => {
    const event = mapNrTournament(
      makeNrTournament({ registrationDeadline: '24.06.2026' }),
    )
    expect(event!.description).toBe('Meldeschluss: 24.06.2026')
    const meta = event!.metadata as TournamentEventMetadata
    expect(meta.registrationDeadline).toBe('24.06.2026')
  })

  it('sets url from registrationUrl', () => {
    const event = mapNrTournament(
      makeNrTournament({ registrationUrl: 'https://example/register' }),
    )
    expect(event!.url).toBe('https://example/register')
  })

  it('returns null for unparseable start date', () => {
    const event = mapNrTournament(makeNrTournament({ dateStart: 'bad' }))
    expect(event).toBeNull()
  })
})
