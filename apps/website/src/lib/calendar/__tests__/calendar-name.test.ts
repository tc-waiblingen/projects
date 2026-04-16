import { describe, expect, it } from 'vitest'
import { getCalendarName } from '../calendar-name'

describe('getCalendarName', () => {
  it('returns the base name when no filters are given', () => {
    expect(
      getCalendarName({ category: null, team: null, teamId: null }),
    ).toBe('TCW-Kalender')
  })

  it('returns the base name with the category label for each category', () => {
    expect(
      getCalendarName({ category: 'matches', team: null, teamId: null }),
    ).toBe('TCW-Kalender (Punktspiele)')
    expect(
      getCalendarName({ category: 'tournaments', team: null, teamId: null }),
    ).toBe('TCW-Kalender (Turniere)')
    expect(
      getCalendarName({ category: 'club', team: null, teamId: null }),
    ).toBe('TCW-Kalender (Vereinstermine)')
    expect(
      getCalendarName({ category: 'beginners', team: null, teamId: null }),
    ).toBe('TCW-Kalender (Für Einsteiger)')
    expect(
      getCalendarName({ category: 'children', team: null, teamId: null }),
    ).toBe('TCW-Kalender (Kinder)')
  })

  it('returns the team-specific name when a team is resolved', () => {
    expect(
      getCalendarName({
        category: null,
        team: { season: 'Sommer 2026', name: 'Herren 40' },
        teamId: '123',
      }),
    ).toBe('TCW: Sommer 2026 - Herren 40')
  })

  it('uses the team-specific name even when a category is also set', () => {
    expect(
      getCalendarName({
        category: 'matches',
        team: { season: 'Sommer 2026', name: 'Herren 40' },
        teamId: '123',
      }),
    ).toBe('TCW: Sommer 2026 - Herren 40')
  })

  it('falls back to the base name with the team id when team is not resolved', () => {
    expect(
      getCalendarName({ category: null, team: null, teamId: '123' }),
    ).toBe('TCW-Kalender (123)')
  })

  it('uses the team-id fallback even when a category is set', () => {
    expect(
      getCalendarName({ category: 'matches', team: null, teamId: '123' }),
    ).toBe('TCW-Kalender (123)')
  })
})
