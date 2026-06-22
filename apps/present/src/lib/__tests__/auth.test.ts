// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signSessionToken, verifySessionToken } from '../auth'

const SECRET = 'a'.repeat(32)

describe('auth', () => {
  beforeEach(() => {
    vi.stubEnv('PRESENT_SESSION_SECRET', SECRET)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('round-trips moderator sessions', async () => {
    const token = await signSessionToken({ sub: 'entra:1', role: 'moderator', name: 'Moderator' })
    await expect(verifySessionToken(token)).resolves.toEqual({ sub: 'entra:1', role: 'moderator', name: 'Moderator' })
  })

  it('round-trips admin sessions', async () => {
    const token = await signSessionToken({ sub: 'entra:1', role: 'admin' })
    await expect(verifySessionToken(token)).resolves.toEqual({ sub: 'entra:1', role: 'admin' })
  })

  it('rejects bad and expired tokens', async () => {
    await expect(verifySessionToken(undefined)).resolves.toBeNull()
    await expect(verifySessionToken('not-a-jwt')).resolves.toBeNull()
    const token = await signSessionToken({ sub: 'entra:1', role: 'moderator' }, Date.now() - 24 * 60 * 60 * 1000)
    await expect(verifySessionToken(token)).resolves.toBeNull()
  })

  it('requires a strong secret', async () => {
    vi.stubEnv('PRESENT_SESSION_SECRET', 'short')
    await expect(signSessionToken({ sub: 'x', role: 'moderator' })).rejects.toThrow(/at least 32/)
  })
})
