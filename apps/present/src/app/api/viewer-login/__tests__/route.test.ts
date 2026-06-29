// @vitest-environment node
import { getPresentationByCode, type Presentation } from '@/lib/presentations'
import { signViewerToken, VIEWER_MAX_AGE_SECONDS, viewerCookieName } from '@/lib/viewer-auth'
import { verifyViewerPassword } from '@/lib/viewer-password'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '../route'

vi.mock('@/lib/presentations', () => ({
  getPresentationByCode: vi.fn(),
}))
vi.mock('@/lib/viewer-password', () => ({ verifyViewerPassword: vi.fn() }))
vi.mock('@/lib/viewer-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/viewer-auth')>()
  return {
    ...actual,
    signViewerToken: vi.fn(),
  }
})

const presentation: Presentation = {
  id: 8,
  code: 'WAI-0626',
  title: 'Jahreshauptversammlung',
  slug: 'jahreshauptversammlung',
  moderatorSub: 'entra:moderator',
  moderatorName: 'Moderator',
  viewerPasswordHash: '$argon2id$hash',
  status: 'ready',
  livekitRoomName: 'tcw-present-wai-0626',
  startsAt: '2026-06-21',
  endedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

describe('viewer login route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPresentationByCode).mockReturnValue(presentation)
    vi.mocked(verifyViewerPassword).mockResolvedValue(true)
    vi.mocked(signViewerToken).mockResolvedValue('viewer-session-token')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rejects requests without a code or password', async () => {
    const response = await POST(formRequest({ code: 'WAI-0626' }))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3003/p/invalid?error=1')
    expect(signViewerToken).not.toHaveBeenCalled()
  })

  it('rejects unknown or ended presentations', async () => {
    vi.mocked(getPresentationByCode).mockReturnValue({ ...presentation, status: 'ended' })

    const response = await POST(formRequest({ code: 'WAI-0626', password: 'wrong-pass' }))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3003/p/WAI-0626?error=1')
    expect(verifyViewerPassword).not.toHaveBeenCalled()
  })

  it('rejects wrong passwords without issuing a viewer cookie', async () => {
    vi.mocked(verifyViewerPassword).mockResolvedValue(false)

    const response = await POST(formRequest({ code: 'WAI-0626', password: 'wrong-pass' }))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3003/p/WAI-0626?error=1')
    expect(verifyViewerPassword).toHaveBeenCalledWith('$argon2id$hash', 'wrong-pass')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(signViewerToken).not.toHaveBeenCalled()
  })

  it('issues an anonymous password-only viewer session cookie', async () => {
    const response = await POST(formRequest({ code: 'WAI-0626', password: 'correct-pass' }))
    const setCookie = response.headers.get('set-cookie') ?? ''

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3003/p/WAI-0626/watch')
    expect(signViewerToken).toHaveBeenCalledWith({
      presentationId: 8,
      code: 'WAI-0626',
      viewerId: expect.stringMatching(/^viewer:8:[0-9a-f-]+$/),
    })
    expect(setCookie).toContain(`${viewerCookieName('WAI-0626')}=viewer-session-token`)
    expect(setCookie).toContain(`Max-Age=${VIEWER_MAX_AGE_SECONDS}`)
    expect(setCookie).toContain('HttpOnly')
  })

  it('allows an empty submitted password when the verifier accepts it', async () => {
    const response = await POST(formRequest({ code: 'WAI-0626', password: '' }))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3003/p/WAI-0626/watch')
    expect(verifyViewerPassword).toHaveBeenCalledWith('$argon2id$hash', '')
    expect(signViewerToken).toHaveBeenCalledWith({
      presentationId: 8,
      code: 'WAI-0626',
      viewerId: expect.stringMatching(/^viewer:8:[0-9a-f-]+$/),
    })
  })

  it('automatically issues a viewer session when no password is configured', async () => {
    vi.mocked(getPresentationByCode).mockReturnValue({ ...presentation, viewerPasswordHash: '' })

    const response = await GET(getRequest('http://localhost:3003/api/viewer-login?code=WAI-0626'))
    const setCookie = response.headers.get('set-cookie') ?? ''

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3003/p/WAI-0626/watch')
    expect(verifyViewerPassword).not.toHaveBeenCalled()
    expect(signViewerToken).toHaveBeenCalledWith({
      presentationId: 8,
      code: 'WAI-0626',
      viewerId: expect.stringMatching(/^viewer:8:[0-9a-f-]+$/),
    })
    expect(setCookie).toContain(`${viewerCookieName('WAI-0626')}=viewer-session-token`)
  })

  it('sends automatic viewer entry back to the login page when a password is configured', async () => {
    const response = await GET(getRequest('http://localhost:3003/api/viewer-login?code=WAI-0626'))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3003/p/WAI-0626')
    expect(signViewerToken).not.toHaveBeenCalled()
  })

  it('marks viewer session cookies secure in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const response = await POST(formRequest({ code: 'WAI-0626', password: 'correct-pass' }))
    const setCookie = response.headers.get('set-cookie') ?? ''

    expect(setCookie).toContain(`${viewerCookieName('WAI-0626')}=viewer-session-token`)
    expect(setCookie).toContain('Secure')
  })
})

function getRequest(url: string): NextRequest {
  return new NextRequest(url)
}

function formRequest(fields: Record<string, string>): NextRequest {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value)
  }
  return new NextRequest('http://localhost:3003/api/viewer-login', {
    method: 'POST',
    body: form,
  })
}
