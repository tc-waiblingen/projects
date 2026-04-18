import { describe, expect, it } from 'vitest'
import { formatRelativeDate } from '../relative-date'

describe('formatRelativeDate', () => {
  const now = new Date(2026, 3, 18, 12, 0, 0)

  function daysAgo(days: number): Date {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  }

  it('returns "heute" for today or future', () => {
    expect(formatRelativeDate(now, now)).toBe('heute')
    expect(formatRelativeDate(daysAgo(-1), now)).toBe('heute')
  })

  it('returns "gestern" for yesterday', () => {
    expect(formatRelativeDate(daysAgo(1), now)).toBe('gestern')
  })

  it('returns "vor N Tagen" for 2–6 days', () => {
    expect(formatRelativeDate(daysAgo(3), now)).toBe('vor 3 Tagen')
    expect(formatRelativeDate(daysAgo(6), now)).toBe('vor 6 Tagen')
  })

  it('returns "vor einer Woche" for 7–13 days', () => {
    expect(formatRelativeDate(daysAgo(7), now)).toBe('vor einer Woche')
    expect(formatRelativeDate(daysAgo(13), now)).toBe('vor einer Woche')
  })

  it('returns "vor N Wochen" for 14–29 days', () => {
    expect(formatRelativeDate(daysAgo(14), now)).toBe('vor 2 Wochen')
    expect(formatRelativeDate(daysAgo(29), now)).toBe('vor 4 Wochen')
  })

  it('returns "vor einem Monat" for 30–59 days', () => {
    expect(formatRelativeDate(daysAgo(30), now)).toBe('vor einem Monat')
    expect(formatRelativeDate(daysAgo(59), now)).toBe('vor einem Monat')
  })

  it('returns "vor N Monaten" for 60+ days', () => {
    expect(formatRelativeDate(daysAgo(60), now)).toBe('vor 2 Monaten')
    expect(formatRelativeDate(daysAgo(120), now)).toBe('vor 4 Monaten')
  })
})
