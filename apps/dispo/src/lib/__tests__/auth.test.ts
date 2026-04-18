// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signSessionToken, verifySessionToken } from '../auth'

const SECRET = 'a'.repeat(32)

describe('auth', () => {
  beforeEach(() => {
    vi.stubEnv('DISPO_SESSION_SECRET', SECRET)
  })
  afterEach(() => vi.unstubAllEnvs())

  describe('signSessionToken / verifySessionToken', () => {
    it('round-trips an operator session', async () => {
      const token = await signSessionToken({ sub: 'local:operator', role: 'operator' })
      await expect(verifySessionToken(token)).resolves.toEqual({ sub: 'local:operator', role: 'operator' })
    })

    it('round-trips an admin session', async () => {
      const token = await signSessionToken({ sub: 'entra:abc-123', role: 'admin' })
      await expect(verifySessionToken(token)).resolves.toEqual({ sub: 'entra:abc-123', role: 'admin' })
    })

    it('round-trips a session with a name claim', async () => {
      const token = await signSessionToken({ sub: 'entra:abc', role: 'admin', name: 'Tom Siebers' })
      await expect(verifySessionToken(token)).resolves.toEqual({
        sub: 'entra:abc',
        role: 'admin',
        name: 'Tom Siebers',
      })
    })

    it('rejects undefined and empty', async () => {
      await expect(verifySessionToken(undefined)).resolves.toBeNull()
      await expect(verifySessionToken('')).resolves.toBeNull()
    })

    it('rejects malformed tokens', async () => {
      await expect(verifySessionToken('nodothere')).resolves.toBeNull()
    })

    it('rejects a tampered signature', async () => {
      const token = await signSessionToken({ sub: 'local:operator', role: 'operator' })
      const lastDot = token.lastIndexOf('.')
      const head = token.substring(0, lastDot + 1)
      const sig = token.substring(lastDot + 1)
      const flipped = sig.endsWith('A') ? `${sig.slice(0, -1)}B` : `${sig.slice(0, -1)}A`
      await expect(verifySessionToken(`${head}${flipped}`)).resolves.toBeNull()
    })

    it('rejects an expired token', async () => {
      const past = Date.now() - (60 * 60 * 24 * 7 + 60) * 1000
      const token = await signSessionToken({ sub: 'local:operator', role: 'operator' }, past)
      await expect(verifySessionToken(token)).resolves.toBeNull()
    })

    it('rejects a token signed with a different secret', async () => {
      const token = await signSessionToken({ sub: 'local:operator', role: 'operator' })
      vi.stubEnv('DISPO_SESSION_SECRET', 'b'.repeat(32))
      await expect(verifySessionToken(token)).resolves.toBeNull()
    })

    it('rejects an unknown role', async () => {
      const token = await signSessionToken({ sub: 'x', role: 'admin' })
      // Hand-craft a valid JWT with bogus role to ensure verifier rejects.
      vi.stubEnv('DISPO_SESSION_SECRET', SECRET)
      const { SignJWT } = await import('jose')
      const bad = await new SignJWT({ role: 'superuser' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('x')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(SECRET))
      await expect(verifySessionToken(token)).resolves.toEqual({ sub: 'x', role: 'admin' })
      await expect(verifySessionToken(bad)).resolves.toBeNull()
    })

    it('throws when secret is too short', async () => {
      vi.stubEnv('DISPO_SESSION_SECRET', 'tooshort')
      await expect(signSessionToken({ sub: 'x', role: 'operator' })).rejects.toThrow(/at least 32/)
    })
  })
})
