import { describe, expect, it } from 'vitest'
import { formatPhoneNumber, formatPhoneNumberInternational } from '../phone-number-helper'

describe('phone-number-helper', () => {
  describe('formatPhoneNumber', () => {
    it('formats German landline number', () => {
      const result = formatPhoneNumber('+49 7151 123456')
      // Should format as national with en-dash between area code and local
      expect(result).toContain('07151')
    })

    it('formats German mobile number', () => {
      const result = formatPhoneNumber('+49 171 1234567')
      expect(result).toContain('0171')
    })

    it('formats number without country code (assumes DE)', () => {
      const result = formatPhoneNumber('07151 123456')
      expect(result).toContain('07151')
    })

    it('adds en-dash between area code and local number', () => {
      // When there are exactly 2 components after formatting
      const result = formatPhoneNumber('+49 7151 123456')
      // The function joins with " – " (en-dash) when there are 2 parts
      expect(result).toMatch(/07151\s+[–-]\s+\d+/)
    })

    it('handles number with multiple spaces', () => {
      const result = formatPhoneNumber('+49  7151   123456')
      expect(result).toBeTruthy()
      expect(result).not.toContain('  ')
    })

    it('returns original for invalid number', () => {
      const result = formatPhoneNumber('not-a-number')
      expect(result).toBe('not-a-number')
    })

    it('handles empty string', () => {
      const result = formatPhoneNumber('')
      expect(result).toBe('')
    })

    it('formats Stuttgart area code correctly', () => {
      const result = formatPhoneNumber('+49 711 1234567')
      expect(result).toContain('0711')
    })

    it('formats Waiblingen area code correctly', () => {
      const result = formatPhoneNumber('+49 7151 98765')
      expect(result).toContain('07151')
    })
  })

  describe('formatPhoneNumberInternational', () => {
    it('formats German number in international format', () => {
      const result = formatPhoneNumberInternational('+49 7151 123456')
      expect(result).toMatch(/^\+49/)
    })

    it('adds country code to national number', () => {
      const result = formatPhoneNumberInternational('07151 123456')
      expect(result).toMatch(/^\+49/)
    })

    it('formats mobile number internationally', () => {
      const result = formatPhoneNumberInternational('+49 171 1234567')
      expect(result).toMatch(/^\+49\s+171/)
    })

    it('returns original for invalid number', () => {
      const result = formatPhoneNumberInternational('invalid')
      expect(result).toBe('invalid')
    })

    it('handles empty string', () => {
      const result = formatPhoneNumberInternational('')
      expect(result).toBe('')
    })

    it('produces E.164-ish format with spaces', () => {
      const result = formatPhoneNumberInternational('+49 7151 123456')
      // International format: +49 7151 123456 (with spaces)
      expect(result).toMatch(/^\+49\s+\d/)
    })
  })
})
