import { describe, expect, it } from 'vitest'
import { teamLabelWithGroup } from '../team-label'

describe('teamLabelWithGroup', () => {
  it('returns team name alone when group is missing', () => {
    expect(teamLabelWithGroup('Herren 40 (1)', undefined)).toBe('Herren 40 (1)')
    expect(teamLabelWithGroup('Herren 40 (1)', null)).toBe('Herren 40 (1)')
    expect(teamLabelWithGroup('Herren 40 (1)', '')).toBe('Herren 40 (1)')
  })

  it('strips the shared leading prefix from the group', () => {
    expect(
      teamLabelWithGroup('Herren 40 (1)', 'Herren 40 Verbandsliga'),
    ).toBe('Herren 40 (1) (Verbandsliga)')
  })

  it('keeps the full group when there is no overlap', () => {
    expect(teamLabelWithGroup('Damen 2', 'Bezirksklasse B')).toBe(
      'Damen 2 (Bezirksklasse B)',
    )
  })

  it('omits the suffix when group is fully consumed by the prefix', () => {
    expect(teamLabelWithGroup('Herren 40', 'Herren 40')).toBe('Herren 40')
  })

  it('trims leftover whitespace from the remainder', () => {
    expect(
      teamLabelWithGroup('Herren 40', 'Herren 40   Bezirksliga'),
    ).toBe('Herren 40 (Bezirksliga)')
  })
})
