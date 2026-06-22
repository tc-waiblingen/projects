// @vitest-environment node
import { COOKIE_NAME, MAX_AGE_SECONDS } from '@/lib/auth'
import { NEXT_COOKIE, NONCE_COOKIE, PKCE_COOKIE, STATE_COOKIE, TEMP_MAX_AGE_SECONDS } from '@/lib/entra'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as callbackGET } from '../callback/route'
import { GET as startGET } from '../start/route'

const entraMock = vi.hoisted(() => ({
  buildAuthRequest: vi.fn(),
  exchangeCallback: vi.fn(),
}))

const authMock = vi.hoisted(() => ({
  signSessionToken: vi.fn(),
}))

vi.mock('@/lib/entra', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/entra')>()
  return {
    ...actual,
    buildAuthRequest: entraMock.buildAuthRequest,
    exchangeCallback: entraMock.exchangeCallback,
  }
})

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return {
    ...actual,
    signSessionToken: authMock.signSessionToken,
  }
})

describe('Entra auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    entraMock.buildAuthRequest.mockResolvedValue({
      url: 'https://login.example.test/authorize?client_id=client-id',
      codeVerifier: 'pkce-verifier',
      state: 'state-value',
      nonce: 'nonce-value',
    })
    entraMock.exchangeCallback.mockResolvedValue({
      sub: 'entra:user-1',
      role: 'moderator',
      name: 'Moderator',
    })
    authMock.signSessionToken.mockResolvedValue('session-token')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('starts Entra login with temporary PKCE/state cookies and a safe next path', async () => {
    const response = await startGET(nextRequest('/api/auth/entra/start?next=/moderator/WAI-0626'))
    const setCookie = response.headers.get('set-cookie') ?? ''

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://login.example.test/authorize?client_id=client-id')
    expect(entraMock.buildAuthRequest).toHaveBeenCalledWith('http://localhost:3003/api/auth/entra/callback')
    expect(setCookie).toContain(`${PKCE_COOKIE}=pkce-verifier`)
    expect(setCookie).toContain(`${STATE_COOKIE}=state-value`)
    expect(setCookie).toContain(`${NONCE_COOKIE}=nonce-value`)
    expect(setCookie).toContain(`${NEXT_COOKIE}=%2Fmoderator%2FWAI-0626`)
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain(`Max-Age=${TEMP_MAX_AGE_SECONDS}`)
  })

  it('marks temporary Entra cookies secure in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const response = await startGET(nextRequest('/api/auth/entra/start?next=/presentations'))
    const setCookie = response.headers.get('set-cookie') ?? ''

    expect(setCookie).toContain(`${PKCE_COOKIE}=pkce-verifier`)
    expect(setCookie).toContain('Secure')
  })

  it('sanitizes unsafe next paths before storing them for Entra login', async () => {
    const response = await startGET(nextRequest('/api/auth/entra/start?next=https%3A%2F%2Fevil.example'))

    expect(response.headers.get('set-cookie')).toContain(`${NEXT_COOKIE}=%2Fpresentations`)
  })

  it('rejects callbacks without temporary Entra cookies', async () => {
    const response = await callbackGET(nextRequest('/api/auth/entra/callback?code=abc&state=state-value'))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3003/login?error=entra_state_missing')
    expect(entraMock.exchangeCallback).not.toHaveBeenCalled()
  })

  it('creates the moderator session and clears temporary cookies after callback exchange', async () => {
    const response = await callbackGET(nextRequest('/api/auth/entra/callback?code=abc&state=state-value', entraCookies({
      next: '/moderator/WAI-0626',
    })))
    const setCookie = response.headers.get('set-cookie') ?? ''

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3003/moderator/WAI-0626')
    expect(entraMock.exchangeCallback).toHaveBeenCalledWith({
      callbackUrl: new URL('http://localhost:3003/api/auth/entra/callback?code=abc&state=state-value'),
      codeVerifier: 'pkce-verifier',
      expectedState: 'state-value',
      expectedNonce: 'nonce-value',
    })
    expect(authMock.signSessionToken).toHaveBeenCalledWith({
      sub: 'entra:user-1',
      role: 'moderator',
      name: 'Moderator',
    })
    expect(setCookie).toContain(`${COOKIE_NAME}=session-token`)
    expect(setCookie).toContain(`Max-Age=${MAX_AGE_SECONDS}`)
    expect(setCookie).toContain(`${PKCE_COOKIE}=;`)
    expect(setCookie).toContain(`${STATE_COOKIE}=;`)
    expect(setCookie).toContain(`${NONCE_COOKIE}=;`)
    expect(setCookie).toContain(`${NEXT_COOKIE}=;`)
  })

  it('marks moderator session cookies secure in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const response = await callbackGET(nextRequest('/api/auth/entra/callback?code=abc&state=state-value', entraCookies()))
    const setCookie = response.headers.get('set-cookie') ?? ''

    expect(setCookie).toContain(`${COOKIE_NAME}=session-token`)
    expect(setCookie).toContain('Secure')
  })

  it('sanitizes the callback next cookie before redirecting', async () => {
    const response = await callbackGET(nextRequest('/api/auth/entra/callback?code=abc&state=state-value', entraCookies({
      next: 'https://evil.example',
    })))

    expect(response.headers.get('location')).toBe('http://localhost:3003/presentations')
  })

  it('redirects to login if the callback exchange fails', async () => {
    entraMock.exchangeCallback.mockRejectedValue(new Error('bad callback'))

    const response = await callbackGET(nextRequest('/api/auth/entra/callback?code=abc&state=state-value', entraCookies()))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3003/login?error=entra_exchange_failed')
    expect(authMock.signSessionToken).not.toHaveBeenCalled()
  })
})

function nextRequest(path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost:3003${path}`, {
    headers: cookie ? { cookie } : undefined,
  })
}

function entraCookies(options: { next?: string } = {}): string {
  return [
    `${PKCE_COOKIE}=pkce-verifier`,
    `${STATE_COOKIE}=state-value`,
    `${NONCE_COOKIE}=nonce-value`,
    `${NEXT_COOKIE}=${options.next ?? '/presentations'}`,
  ].join('; ')
}
