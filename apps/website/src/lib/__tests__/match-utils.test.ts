import { describe, expect, it } from 'vitest'
import { isMatchPlayed } from '../match-utils'

describe('isMatchPlayed', () => {
  describe('returns true (match played)', () => {
    it('returns true for a regular result', () => {
      expect(isMatchPlayed('6:3', 'https://example.com/report')).toBe(true)
    })

    it('returns true for result without reportUrl', () => {
      expect(isMatchPlayed('6:3', undefined)).toBe(true)
    })

    it('returns true for undefined result without reportUrl', () => {
      expect(isMatchPlayed(undefined, undefined)).toBe(true)
    })

    it('returns true for a draw that is not 0:0', () => {
      expect(isMatchPlayed('3:3', 'https://example.com/report')).toBe(true)
    })
  })

  describe('returns false (match not played)', () => {
    it('returns false for 0:0 result', () => {
      expect(isMatchPlayed('0:0', 'https://example.com/report')).toBe(false)
    })

    it('returns false for 0:0 result without reportUrl', () => {
      expect(isMatchPlayed('0:0', undefined)).toBe(false)
    })

    it('returns false when reportUrl contains Vorlage', () => {
      expect(isMatchPlayed('6:3', 'https://example.com/Vorlage/report')).toBe(false)
    })

    it('returns false when reportUrl contains Vorlage regardless of result', () => {
      expect(isMatchPlayed(undefined, 'https://example.com/Vorlage')).toBe(false)
    })

    it('returns false for 0:0 AND Vorlage in URL', () => {
      expect(isMatchPlayed('0:0', 'https://example.com/Vorlage')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles Vorlage appearing anywhere in the URL', () => {
      expect(isMatchPlayed('6:3', 'https://Vorlage.example.com/report')).toBe(false)
      expect(isMatchPlayed('6:3', 'https://example.com/spielVorlage')).toBe(false)
    })

    it('is case-sensitive for Vorlage', () => {
      expect(isMatchPlayed('6:3', 'https://example.com/vorlage')).toBe(true)
      expect(isMatchPlayed('6:3', 'https://example.com/VORLAGE')).toBe(true)
    })

    it('only matches exact 0:0 for score check', () => {
      expect(isMatchPlayed('10:0', 'https://example.com/report')).toBe(true)
      expect(isMatchPlayed('0:10', 'https://example.com/report')).toBe(true)
    })
  })
})
