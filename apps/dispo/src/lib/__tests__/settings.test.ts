// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { openDb } from '../db'
import { getPasswordHash, setPassword, verifyPassword } from '../settings'

describe('settings', () => {
  it('starts with no password', () => {
    const d = openDb(':memory:')
    expect(getPasswordHash(d)).toBeNull()
    d.close()
  })

  it('set then verify returns true for the right password', async () => {
    const d = openDb(':memory:')
    await setPassword('pa55word', d)
    expect(getPasswordHash(d)).toMatch(/^\$argon2id\$/)
    await expect(verifyPassword('pa55word', d)).resolves.toBe(true)
    d.close()
  })

  it('rejects wrong passwords', async () => {
    const d = openDb(':memory:')
    await setPassword('pa55word', d)
    await expect(verifyPassword('pa55worD', d)).resolves.toBe(false)
    await expect(verifyPassword('', d)).resolves.toBe(false)
    d.close()
  })

  it('verify returns false when no password is set', async () => {
    const d = openDb(':memory:')
    await expect(verifyPassword('anything', d)).resolves.toBe(false)
    d.close()
  })

  it('setPassword replaces the previous hash', async () => {
    const d = openDb(':memory:')
    await setPassword('first', d)
    await setPassword('second', d)
    await expect(verifyPassword('first', d)).resolves.toBe(false)
    await expect(verifyPassword('second', d)).resolves.toBe(true)
    d.close()
  })
})
