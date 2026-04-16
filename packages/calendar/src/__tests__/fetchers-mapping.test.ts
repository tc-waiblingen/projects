import { describe, expect, it } from 'vitest'
import { _testHelpers } from '../fetchers'
import type { NrMatch, NrTeam, NrTournament } from '../nr-client'
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

function makeNrTeam(overrides: Partial<NrTeam> = {}): NrTeam {
  return {
    id: 't1',
    clubId: 'tcw',
    season: 'Sommer 2026',
    seasonSort: 1,
    league: 'Herren 40',
    leagueSort: 3,
    name: 'Herren 40 (1)',
    teamSize: 6,
    isActiveSeason: true,
    lastRefreshedAt: '2026-04-14T00:00:00Z',
    group: 'Herren 40 Verbandsliga',
    groupUrl: 'https://example/group',
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
  const team = makeNrTeam()
  const context = {
    teamsById: new Map([[team.id, team]]),
    clubName: 'Tennis-Club Waiblingen e.V.',
  }

  it('maps a full home match with time, result, and team enrichment', () => {
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
      context,
    )
    expect(event).not.toBeNull()
    expect(event!.source).toBe('match')
    expect(event!.id).toBe('m1')
    expect(event!.title).toBe(
      'Herren 40 Verbandsliga: TC Waiblingen vs. TC Beispiel',
    )
    expect(event!.location).toBe('TCW Halle')
    expect(event!.startTime).toBe('10:00')
    expect(event!.isAllDay).toBe(false)

    const meta = event!.metadata as MatchEventMetadata
    expect(meta.teamId).toBe('t1')
    expect(meta.teamName).toBe('Herren 40 (1)')
    expect(meta.seasonSort).toBe(1)
    expect(meta.group).toBe('Herren 40 Verbandsliga')
    expect(meta.groupUrl).toBe('https://example/group')
    expect(meta.isHome).toBe(true)
    expect(meta.result).toBe('6:3')
  })

  it('falls back to match.league when team.group is missing', () => {
    const teamWithoutGroup = makeNrTeam({ group: undefined })
    const event = mapNrMatch(makeNrMatch(), {
      teamsById: new Map([[teamWithoutGroup.id, teamWithoutGroup]]),
    })
    expect(event!.title).toBe('Herren 40: TC Waiblingen vs. TC Beispiel')
  })

  it('drops title prefix when both team.group and match.league are empty', () => {
    const teamWithoutGroup = makeNrTeam({ group: undefined })
    const event = mapNrMatch(makeNrMatch({ league: '' }), {
      teamsById: new Map([[teamWithoutGroup.id, teamWithoutGroup]]),
    })
    expect(event!.title).toBe('TC Waiblingen vs. TC Beispiel')
  })

  it('uses club name as location fallback for home matches', () => {
    const event = mapNrMatch(
      makeNrMatch({ location: undefined, isHome: true }),
      context,
    )
    expect(event!.location).toBe('Tennis-Club Waiblingen e.V.')
  })

  it('falls back to "Heim" when club name is unavailable on home match', () => {
    const event = mapNrMatch(
      makeNrMatch({ location: undefined, isHome: true }),
      { teamsById: context.teamsById },
    )
    expect(event!.location).toBe('Heim')
  })

  it('uses "Auswärts" as location fallback for away matches', () => {
    const event = mapNrMatch(
      makeNrMatch({ location: undefined, isHome: false }),
      context,
    )
    expect(event!.location).toBe('Auswärts')
  })

  it('keeps API-provided location over any fallback', () => {
    const event = mapNrMatch(
      makeNrMatch({ location: 'TC Example Platz 3', isHome: false }),
      context,
    )
    expect(event!.location).toBe('TC Example Platz 3')
  })

  it('leaves team metadata undefined when team is missing from lookup', () => {
    const event = mapNrMatch(makeNrMatch({ teamId: 'unknown' }), context)
    const meta = event!.metadata as MatchEventMetadata
    expect(meta.teamId).toBe('unknown')
    expect(meta.teamName).toBeUndefined()
    expect(meta.seasonSort).toBeUndefined()
  })

  it('returns null for unparseable date', () => {
    const event = mapNrMatch(makeNrMatch({ matchDate: 'bogus' }), context)
    expect(event).toBeNull()
  })
})

describe('mapNrTournament', () => {
  it('maps a single-day tournament using the API id', () => {
    const event = mapNrTournament(makeNrTournament({ id: 'trn-xyz' }))
    expect(event!.id).toBe('trn-xyz')
    expect(event!.source).toBe('tournament')
    expect(event!.title).toBe('Clubmeisterschaft')
    expect(event!.isAllDay).toBe(true)
    expect(event!.isMultiDay).toBe(false)
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
