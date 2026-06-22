// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const openid = vi.hoisted(() => ({
  authorizationCodeGrant: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  calculatePKCECodeChallenge: vi.fn(),
  discovery: vi.fn(),
  randomNonce: vi.fn(),
  randomPKCECodeVerifier: vi.fn(),
  randomState: vi.fn(),
}))

vi.mock('openid-client', () => openid)

const ENTRA_ENV = {
  ENTRA_TENANT_ID: 'tenant-id',
  ENTRA_CLIENT_ID: 'client-id',
  ENTRA_CLIENT_SECRET: 'client-secret',
}

describe('entra', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    for (const [name, value] of Object.entries(ENTRA_ENV)) {
      vi.stubEnv(name, value)
    }
    openid.discovery.mockResolvedValue({ issuer: 'entra-config' })
    openid.randomPKCECodeVerifier.mockReturnValue('pkce-verifier')
    openid.calculatePKCECodeChallenge.mockResolvedValue('pkce-challenge')
    openid.randomState.mockReturnValue('state-value')
    openid.randomNonce.mockReturnValue('nonce-value')
    openid.buildAuthorizationUrl.mockImplementation((_config, params) => {
      const url = new URL('https://login.example.test/authorize')
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') url.searchParams.set(key, value)
      }
      return url
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds a PKCE authorization request for the configured tenant', async () => {
    const { buildAuthRequest } = await import('../entra')

    const request = await buildAuthRequest('https://present.example.test/api/auth/entra/callback')
    const url = new URL(request.url)

    expect(openid.discovery).toHaveBeenCalledWith(new URL('https://login.microsoftonline.com/tenant-id/v2.0'), 'client-id', 'client-secret')
    expect(request).toMatchObject({
      codeVerifier: 'pkce-verifier',
      state: 'state-value',
      nonce: 'nonce-value',
    })
    expect(url.searchParams.get('redirect_uri')).toBe('https://present.example.test/api/auth/entra/callback')
    expect(url.searchParams.get('scope')).toBe('openid profile')
    expect(url.searchParams.get('code_challenge')).toBe('pkce-challenge')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('state')).toBe('state-value')
    expect(url.searchParams.get('nonce')).toBe('nonce-value')
  })

  it('maps the configured moderator role from ID token claims', async () => {
    openid.authorizationCodeGrant.mockResolvedValue(tokensWithClaims({
      sub: 'user-1',
      roles: ['Present.Moderator'],
      preferred_username: 'moderator@example.test',
    }))
    const { exchangeCallback } = await import('../entra')

    await expect(exchangeCallback(callbackParams())).resolves.toEqual({
      sub: 'entra:user-1',
      role: 'moderator',
      name: 'moderator@example.test',
    })
  })

  it('prefers the configured admin role when both roles are present', async () => {
    vi.stubEnv('ENTRA_ADMIN_ROLE', 'Custom.Admin')
    vi.stubEnv('ENTRA_MODERATOR_ROLE', 'Custom.Moderator')
    openid.authorizationCodeGrant.mockResolvedValue(tokensWithClaims({
      sub: 'user-2',
      roles: ['Custom.Moderator', 'Custom.Admin'],
      name: 'Admin User',
    }))
    const { exchangeCallback } = await import('../entra')

    await expect(exchangeCallback(callbackParams())).resolves.toEqual({
      sub: 'entra:user-2',
      role: 'admin',
      name: 'Admin User',
    })
  })

  it('rejects Entra users without a required role', async () => {
    openid.authorizationCodeGrant.mockResolvedValue(tokensWithClaims({
      sub: 'user-3',
      roles: ['Other.Role'],
    }))
    const { exchangeCallback } = await import('../entra')

    await expect(exchangeCallback(callbackParams())).rejects.toThrow(/missing required Present role/)
  })

  it('requires the Entra client environment', async () => {
    vi.stubEnv('ENTRA_CLIENT_SECRET', '')
    const { buildAuthRequest } = await import('../entra')

    await expect(buildAuthRequest('https://present.example.test/callback')).rejects.toThrow(/ENTRA_TENANT_ID/)
  })
})

function callbackParams() {
  return {
    callbackUrl: new URL('https://present.example.test/api/auth/entra/callback?code=abc&state=state-value'),
    codeVerifier: 'pkce-verifier',
    expectedState: 'state-value',
    expectedNonce: 'nonce-value',
  }
}

function tokensWithClaims(claims: Record<string, unknown>) {
  return {
    claims: () => claims,
  }
}
