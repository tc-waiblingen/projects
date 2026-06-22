// @vitest-environment node
import { getSession } from '@/lib/auth'
import { ensureLiveKitRoom } from '@/lib/livekit'
import { canManagePresentation, getPresentationByCode, markPresentationLive, type Presentation } from '@/lib/presentations'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'

vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/livekit', () => ({ ensureLiveKitRoom: vi.fn() }))
vi.mock('@/lib/presentations', () => ({
  canManagePresentation: vi.fn(),
  getPresentationByCode: vi.fn(),
  markPresentationLive: vi.fn(),
}))

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

describe('go-live route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSession).mockResolvedValue({ sub: 'entra:moderator', role: 'moderator', name: 'Moderator' })
    vi.mocked(getPresentationByCode).mockReturnValue(presentation)
    vi.mocked(canManagePresentation).mockReturnValue(true)
    vi.mocked(markPresentationLive).mockReturnValue({ ...presentation, status: 'live' })
  })

  it('rejects anonymous requests', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const response = await POST(request(), params())

    expect(response.status).toBe(401)
    expect(ensureLiveKitRoom).not.toHaveBeenCalled()
    expect(markPresentationLive).not.toHaveBeenCalled()
  })

  it('rejects presentations the session cannot manage', async () => {
    vi.mocked(canManagePresentation).mockReturnValue(false)

    const response = await POST(request(), params())

    expect(response.status).toBe(404)
    expect(ensureLiveKitRoom).not.toHaveBeenCalled()
    expect(markPresentationLive).not.toHaveBeenCalled()
  })

  it('does not create LiveKit rooms for ended presentations', async () => {
    vi.mocked(getPresentationByCode).mockReturnValue({ ...presentation, status: 'ended' })

    const response = await POST(request(), params())

    expect(response.status).toBe(409)
    expect(ensureLiveKitRoom).not.toHaveBeenCalled()
    expect(markPresentationLive).not.toHaveBeenCalled()
  })

  it('ensures the LiveKit room before marking the presentation live', async () => {
    const response = await POST(request(), params())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(ensureLiveKitRoom).toHaveBeenCalledWith(presentation)
    expect(markPresentationLive).toHaveBeenCalledWith('WAI-0626')
    expect(body.presentation.status).toBe('live')
  })
})

function request(): NextRequest {
  return new NextRequest('http://localhost:3003/api/presentations/WAI-0626/go-live', { method: 'POST' })
}

function params() {
  return { params: Promise.resolve({ code: 'WAI-0626' }) }
}
