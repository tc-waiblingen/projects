import { describe, expect, it } from 'vitest'
import { buildTournamentDateRuns, formatTournamentPlayDates } from '../format-dates'

describe('formatTournamentPlayDates', () => {
  it('renders a single date with year', () => {
    const out = formatTournamentPlayDates([new Date(2026, 1, 23)])
    expect(out).toBe('23.2.2026')
  })

  it('collapses two consecutive days into one same-month run', () => {
    const out = formatTournamentPlayDates([new Date(2026, 1, 21), new Date(2026, 1, 22)])
    expect(out).toBe('21. – 22.2.2026')
  })

  it('formats consecutive days that cross a month boundary', () => {
    const out = formatTournamentPlayDates([new Date(2026, 1, 28), new Date(2026, 2, 1)])
    expect(out).toBe('28.2. – 1.3.2026')
  })

  it('groups the STS pattern into three runs with the year only on the last', () => {
    const out = formatTournamentPlayDates([
      new Date(2026, 1, 21),
      new Date(2026, 1, 22),
      new Date(2026, 1, 28),
      new Date(2026, 2, 1),
      new Date(2026, 2, 7),
      new Date(2026, 2, 8),
    ])
    expect(out).toBe('21. – 22.2., 28.2. – 1.3., 7. – 8.3.2026')
  })

  it('dedupes and sorts unsorted input', () => {
    const out = formatTournamentPlayDates([
      new Date(2026, 1, 22),
      new Date(2026, 1, 21),
      new Date(2026, 1, 22),
    ])
    expect(out).toBe('21. – 22.2.2026')
  })

  it('uses compact (narrow-NBSP) dash in compact mode', () => {
    const out = formatTournamentPlayDates(
      [new Date(2026, 1, 21), new Date(2026, 1, 22)],
      { compact: true },
    )
    expect(out).toBe('21.\u202F\u2013\u202F22.2.2026')
  })

  it('returns an empty string for an empty list', () => {
    expect(formatTournamentPlayDates([])).toBe('')
  })
})

describe('buildTournamentDateRuns', () => {
  function toKeys(runs: { start: Date; end: Date }[]): string[] {
    const key = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return runs.map((r) => `${key(r.start)}..${key(r.end)}`)
  }

  it('groups consecutive days into one run', () => {
    const runs = buildTournamentDateRuns([
      new Date(2026, 1, 21),
      new Date(2026, 1, 22),
    ])
    expect(toKeys(runs)).toEqual(['2026-02-21..2026-02-22'])
  })

  it('produces one run per gap', () => {
    const runs = buildTournamentDateRuns([
      new Date(2026, 1, 21),
      new Date(2026, 1, 22),
      new Date(2026, 1, 28),
      new Date(2026, 2, 1),
      new Date(2026, 2, 7),
      new Date(2026, 2, 8),
    ])
    expect(toKeys(runs)).toEqual([
      '2026-02-21..2026-02-22',
      '2026-02-28..2026-03-01',
      '2026-03-07..2026-03-08',
    ])
  })

  it('sorts and dedupes input', () => {
    const runs = buildTournamentDateRuns([
      new Date(2026, 1, 22),
      new Date(2026, 1, 21),
      new Date(2026, 1, 22),
    ])
    expect(toKeys(runs)).toEqual(['2026-02-21..2026-02-22'])
  })

  it('returns an empty array for empty input', () => {
    expect(buildTournamentDateRuns([])).toEqual([])
  })
})
