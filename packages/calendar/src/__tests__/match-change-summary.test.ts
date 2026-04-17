import { describe, expect, it } from 'vitest'
import { buildMatchChangeSummary } from '../match-change-summary'
import type { NrMatch, NrMatchChange, NrTeam } from '../nr-client'

function match(overrides: Partial<NrMatch> & { id: string }): NrMatch {
  return {
    teamId: overrides.teamId ?? 't1',
    clubId: overrides.clubId ?? 'c1',
    season: overrides.season ?? '2025/26',
    league: overrides.league ?? 'Herren',
    matchDate: overrides.matchDate ?? '2026-05-10',
    homeTeam: overrides.homeTeam ?? 'TC Waiblingen',
    awayTeam: overrides.awayTeam ?? 'Opponent',
    isHome: overrides.isHome ?? true,
    lastRefreshedAt: overrides.lastRefreshedAt ?? '2026-04-17T00:00:00Z',
    ...overrides,
  }
}

function team(id: string, name: string, group?: string): NrTeam {
  return {
    id,
    clubId: 'c1',
    season: '2025/26',
    seasonSort: 1,
    league: 'Herren',
    leagueSort: 1,
    name,
    teamSize: 6,
    isActiveSeason: true,
    lastRefreshedAt: '2026-04-17T00:00:00Z',
    group,
  }
}

function change(overrides: Partial<NrMatchChange> & { id: number }): NrMatchChange {
  return {
    matchId: overrides.matchId ?? 'm1',
    clubId: overrides.clubId ?? 'c1',
    teamId: overrides.teamId ?? 't1',
    changedAt: overrides.changedAt ?? '2026-04-15T10:00:00Z',
    field: overrides.field ?? 'match_date',
    oldValue: overrides.oldValue ?? null,
    newValue: overrides.newValue ?? null,
    ...overrides,
  }
}

describe('buildMatchChangeSummary', () => {
  it('filters out result and unknown fields', () => {
    const groups = buildMatchChangeSummary({
      changes: [
        change({ id: 1, field: 'result', newValue: '6:3' }),
        change({ id: 2, field: 'mystery_field', newValue: 'x' }),
      ],
      matches: [match({ id: 'm1' })],
      teams: [team('t1', 'Herren 1')],
    })
    expect(groups).toEqual([])
  })

  it('keeps __created, match_date, match_time, location', () => {
    const groups = buildMatchChangeSummary({
      changes: [
        change({ id: 1, field: '__created', changedAt: '2026-04-15T10:00:00Z' }),
        change({ id: 2, field: 'match_date', changedAt: '2026-04-15T11:00:00Z', matchId: 'm2' }),
        change({ id: 3, field: 'match_time', changedAt: '2026-04-15T12:00:00Z', matchId: 'm3' }),
        change({ id: 4, field: 'location', changedAt: '2026-04-15T13:00:00Z', matchId: 'm4', newValue: 'Halle 2' }),
      ],
      matches: [
        match({ id: 'm1' }),
        match({ id: 'm2' }),
        match({ id: 'm3' }),
        match({ id: 'm4' }),
      ],
      teams: [team('t1', 'Herren 1')],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0]!.entries.map((e) => e.kind)).toEqual([
      'relocated',
      'rescheduled-time',
      'rescheduled-date',
      'created',
    ])
  })

  it('drops changes whose match is not in matches', () => {
    const groups = buildMatchChangeSummary({
      changes: [
        change({ id: 1, field: 'match_date', matchId: 'missing' }),
        change({ id: 2, field: 'match_date', matchId: 'm1' }),
      ],
      matches: [match({ id: 'm1' })],
      teams: [team('t1', 'Herren 1')],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0]!.entries).toHaveLength(1)
    expect(groups[0]!.entries[0]!.matchId).toBe('m1')
  })

  it('dedupes same match+field+day, keeping oldest oldValue and newest newValue', () => {
    const groups = buildMatchChangeSummary({
      changes: [
        change({
          id: 1,
          field: 'match_date',
          changedAt: '2026-04-15T09:00:00Z',
          oldValue: '2026-05-10',
          newValue: '2026-05-17',
        }),
        change({
          id: 2,
          field: 'match_date',
          changedAt: '2026-04-15T14:00:00Z',
          oldValue: '2026-05-17',
          newValue: '2026-05-24',
        }),
      ],
      matches: [match({ id: 'm1', matchDate: '2026-05-24' })],
      teams: [team('t1', 'Herren 1')],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0]!.entries).toHaveLength(1)
    const entry = groups[0]!.entries[0]!
    expect(entry.oldValue).toBe('2026-05-10')
    expect(entry.newValue).toBe('2026-05-24')
  })

  it('groups by local date and sorts groups + entries reverse-chronologically', () => {
    const groups = buildMatchChangeSummary({
      changes: [
        change({ id: 1, field: 'match_date', changedAt: '2026-04-15T10:00:00Z', matchId: 'm1' }),
        change({ id: 2, field: 'match_date', changedAt: '2026-04-17T10:00:00Z', matchId: 'm2' }),
        change({ id: 3, field: 'match_time', changedAt: '2026-04-17T15:00:00Z', matchId: 'm3' }),
      ],
      matches: [match({ id: 'm1' }), match({ id: 'm2' }), match({ id: 'm3' })],
      teams: [team('t1', 'Herren 1')],
    })
    expect(groups.map((g) => g.dateKey)).toEqual(['2026-04-17', '2026-04-15'])
    expect(groups[0]!.entries.map((e) => e.matchId)).toEqual(['m3', 'm2'])
  })

  it('uses formatTeamLabel callback when provided', () => {
    const groups = buildMatchChangeSummary({
      changes: [change({ id: 1, field: '__created' })],
      matches: [match({ id: 'm1' })],
      teams: [team('t1', 'Herren 1', 'Herren 1 (Staffel)')],
      formatTeamLabel: (t) => `[${t.name}]`,
    })
    expect(groups[0]!.entries[0]!.teamLabel).toBe('[Herren 1]')
  })

  it('falls back to teamId when team not found', () => {
    const groups = buildMatchChangeSummary({
      changes: [change({ id: 1, field: '__created', teamId: 'unknown' })],
      matches: [match({ id: 'm1' })],
      teams: [],
    })
    expect(groups[0]!.entries[0]!.teamLabel).toBe('unknown')
  })

  it('fills opponent from away team when isHome', () => {
    const groups = buildMatchChangeSummary({
      changes: [change({ id: 1, field: '__created' })],
      matches: [match({ id: 'm1', isHome: true, homeTeam: 'Us', awayTeam: 'Them' })],
      teams: [team('t1', 'Herren 1')],
    })
    expect(groups[0]!.entries[0]!.opponent).toBe('Them')
  })

  it('fills opponent from home team when away', () => {
    const groups = buildMatchChangeSummary({
      changes: [change({ id: 1, field: '__created' })],
      matches: [match({ id: 'm1', isHome: false, homeTeam: 'Host', awayTeam: 'Us' })],
      teams: [team('t1', 'Herren 1')],
    })
    expect(groups[0]!.entries[0]!.opponent).toBe('Host')
  })
})
