// @vitest-environment node
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth'
import type { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'

const SECRET = 'devsecretdevsecretdevsecretdev12'

describe('dev auth route', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is disabled unless explicitly enabled', async () => {
    vi.stubEnv('PRESENT_SESSION_SECRET', SECRET)
    vi.stubEnv('PRESENT_DEV_AUTH', '0')

    const response = await GET(nextRequest('/api/auth/dev'))

    expect(response.status).toBe(404)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('stays disabled in production even when explicitly enabled', async () => {
    vi.stubEnv('PRESENT_SESSION_SECRET', SECRET)
    vi.stubEnv('PRESENT_DEV_AUTH', '1')
    vi.stubEnv('NODE_ENV', 'production')

    const response = await GET(nextRequest('/api/auth/dev?next=/presentations'))

    expect(response.status).toBe(404)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('creates a local moderator session outside production', async () => {
    vi.stubEnv('PRESENT_SESSION_SECRET', SECRET)
    vi.stubEnv('PRESENT_DEV_AUTH', '1')
    vi.stubEnv('NODE_ENV', 'development')

    const response = await GET(nextRequest('/api/auth/dev?next=/presentations'))
    const cookie = response.headers.get('set-cookie') ?? ''
    const token = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1]

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3003/presentations')
    await expect(verifySessionToken(token)).resolves.toEqual({
      sub: 'dev:moderator',
      role: 'moderator',
      name: 'Local Moderator',
    })
  })

  it('sanitizes unsafe next URLs', async () => {
    vi.stubEnv('PRESENT_SESSION_SECRET', SECRET)
    vi.stubEnv('PRESENT_DEV_AUTH', '1')
    vi.stubEnv('NODE_ENV', 'development')

    const response = await GET(nextRequest('/api/auth/dev?next=https%3A%2F%2Fexample.com'))

    expect(response.headers.get('location')).toBe('http://localhost:3003/presentations')
  })
})

function nextRequest(path: string): NextRequest {
  return new Request(`http://localhost:3003${path}`) as NextRequest
}
