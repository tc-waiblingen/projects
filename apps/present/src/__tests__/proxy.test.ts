// @vitest-environment node
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { proxy } from '../proxy'

vi.mock('@/lib/auth', () => ({
  COOKIE_NAME: 'present_session',
  verifySessionToken: vi.fn(),
}))

describe('proxy route protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifySessionToken).mockResolvedValue(null)
  })

  it('redirects anonymous moderators to login with the original path', async () => {
    const response = await proxy(nextRequest('/presentations?status=live'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3003/login?next=%2Fpresentations%3Fstatus%3Dlive')
  })

  it('rejects anonymous protected API requests', async () => {
    const response = await proxy(nextRequest('/api/livekit/moderator-token'))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('allows protected paths with a valid moderator session', async () => {
    vi.mocked(verifySessionToken).mockResolvedValue({ sub: 'entra:user-1', role: 'moderator' })

    const response = await proxy(nextRequest('/moderator/WAI-0626', `${COOKIE_NAME}=session-token`))

    expect(response.status).toBe(200)
    expect(verifySessionToken).toHaveBeenCalledWith('session-token')
  })

  it('does not protect public viewer routes', async () => {
    const response = await proxy(nextRequest('/p/WAI-0626/watch'))

    expect(response.status).toBe(200)
    expect(verifySessionToken).not.toHaveBeenCalled()
  })

  it('leaves viewer token access to the viewer session route checks', async () => {
    const response = await proxy(nextRequest('/api/livekit/viewer-token'))

    expect(response.status).toBe(200)
    expect(verifySessionToken).not.toHaveBeenCalled()
  })
})

function nextRequest(path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost:3003${path}`, {
    headers: cookie ? { cookie } : undefined,
  })
}
