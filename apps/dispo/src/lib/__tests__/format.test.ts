import { describe, expect, it } from 'vitest'
import { dateKey, formatCourtType, parseIsoDate } from '../format'

describe('format', () => {
  describe('dateKey', () => {
    it('formats a date as YYYY-MM-DD in local time', () => {
      expect(dateKey(new Date(2026, 3, 18))).toBe('2026-04-18')
      expect(dateKey(new Date(2026, 0, 1))).toBe('2026-01-01')
      expect(dateKey(new Date(2026, 11, 31))).toBe('2026-12-31')
    })
  })

  describe('parseIsoDate', () => {
    it('parses valid YYYY-MM-DD into a local-midnight Date', () => {
      const d = parseIsoDate('2026-04-18')
      expect(d).not.toBeNull()
      expect(d!.getFullYear()).toBe(2026)
      expect(d!.getMonth()).toBe(3)
      expect(d!.getDate()).toBe(18)
    })

    it('rejects malformed strings', () => {
      expect(parseIsoDate('2026-4-18')).toBeNull()
      expect(parseIsoDate('not-a-date')).toBeNull()
      expect(parseIsoDate('')).toBeNull()
    })

    it('rejects out-of-range dates', () => {
      expect(parseIsoDate('2026-02-30')).toBeNull()
      expect(parseIsoDate('2026-13-01')).toBeNull()
    })
  })

  describe('formatCourtType', () => {
    it('returns German labels', () => {
      expect(formatCourtType('tennis_indoor')).toBe('Halle')
      expect(formatCourtType('tennis_outdoor')).toBe('Freiplätze')
    })
  })
})
