import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { generateSignature, verifySignature, signUrl, signId } from '../signing'

describe('signing', () => {
  const TEST_SECRET = 'test-signing-secret-12345'

  beforeEach(() => {
    vi.stubEnv('URL_SIGNING_SECRET', TEST_SECRET)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('generateSignature', () => {
    it('returns a 16-character hex string', () => {
      const signature = generateSignature('test-data')
      expect(signature).toMatch(/^[0-9a-f]{16}$/)
    })

    it('returns deterministic output for same input', () => {
      const sig1 = generateSignature('same-data')
      const sig2 = generateSignature('same-data')
      expect(sig1).toBe(sig2)
    })

    it('returns different signatures for different inputs', () => {
      const sig1 = generateSignature('data-one')
      const sig2 = generateSignature('data-two')
      expect(sig1).not.toBe(sig2)
    })

    it('throws when URL_SIGNING_SECRET is not set', () => {
      vi.stubEnv('URL_SIGNING_SECRET', '')
      expect(() => generateSignature('test')).toThrow('URL_SIGNING_SECRET environment variable is not set')
    })
  })

  describe('verifySignature', () => {
    it('accepts valid signature', () => {
      const data = 'my-test-data'
      const signature = generateSignature(data)
      expect(verifySignature(data, signature)).toBe(true)
    })

    it('rejects invalid signature', () => {
      const data = 'my-test-data'
      const wrongSignature = 'abcd1234abcd1234'
      expect(verifySignature(data, wrongSignature)).toBe(false)
    })

    it('rejects signature with wrong length', () => {
      const data = 'my-test-data'
      const shortSignature = 'abcd1234'
      expect(verifySignature(data, shortSignature)).toBe(false)
    })

    it('rejects signature for different data', () => {
      const signature = generateSignature('original-data')
      expect(verifySignature('different-data', signature)).toBe(false)
    })

    it('handles empty data', () => {
      const signature = generateSignature('')
      expect(verifySignature('', signature)).toBe(true)
    })
  })

  describe('signUrl', () => {
    it('generates signature for URL', () => {
      const url = 'https://example.com/image.jpg'
      const signature = signUrl(url)
      expect(signature).toMatch(/^[0-9a-f]{16}$/)
      expect(verifySignature(url, signature)).toBe(true)
    })

    it('handles URLs with query parameters', () => {
      const url = 'https://example.com/image.jpg?width=100&height=200'
      const signature = signUrl(url)
      expect(verifySignature(url, signature)).toBe(true)
    })
  })

  describe('signId', () => {
    it('generates signature for ID without params', () => {
      const id = 'abc-123-def'
      const signature = signId(id)
      expect(signature).toMatch(/^[0-9a-f]{16}$/)
      expect(verifySignature(id, signature)).toBe(true)
    })

    it('generates signature for ID with params', () => {
      const id = 'abc-123-def'
      const params = 'width=100&height=200'
      const signature = signId(id, params)
      // Signature should be for "id:params" format
      expect(verifySignature(`${id}:${params}`, signature)).toBe(true)
    })

    it('produces different signatures with and without params', () => {
      const id = 'abc-123-def'
      const sigWithoutParams = signId(id)
      const sigWithParams = signId(id, 'width=100')
      expect(sigWithoutParams).not.toBe(sigWithParams)
    })

    it('handles empty params string', () => {
      const id = 'abc-123-def'
      const sigEmpty = signId(id, '')
      const sigUndefined = signId(id)
      // Empty string is falsy, so should be same as undefined
      expect(sigEmpty).toBe(sigUndefined)
    })
  })
})
