import { describe, expect, it } from 'vitest'
import { hashViewerPassword, verifyViewerPassword } from '../viewer-password'

describe('viewer password', () => {
  it('hashes and verifies the right password', async () => {
    const encoded = await hashViewerPassword('Sommer2026')
    expect(encoded).toMatch(/^\$argon2id\$/)
    await expect(verifyViewerPassword(encoded, 'Sommer2026')).resolves.toBe(true)
  })

  it('rejects wrong or missing passwords', async () => {
    const encoded = await hashViewerPassword('Sommer2026')
    await expect(verifyViewerPassword(encoded, 'Winter2026')).resolves.toBe(false)
    await expect(verifyViewerPassword(encoded, undefined)).resolves.toBe(false)
    await expect(verifyViewerPassword(null, 'Sommer2026')).resolves.toBe(false)
  })

  it('rejects too-short passwords', async () => {
    await expect(hashViewerPassword('abc')).rejects.toThrow(/at least 4/)
  })
})
