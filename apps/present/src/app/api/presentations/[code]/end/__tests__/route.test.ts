// @vitest-environment node
import { getSession } from '@/lib/auth'
import { closeLiveKitRoom } from '@/lib/livekit'
import { canManagePresentation, endPresentation, getPresentationByCode, type Presentation } from '@/lib/presentations'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'

vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/livekit', () => ({ closeLiveKitRoom: vi.fn() }))
vi.mock('@/lib/presentations', () => ({
  canManagePresentation: vi.fn(),
  endPresentation: vi.fn(),
  getPresentationByCode: vi.fn(),
}))

const presentation: Presentation = {
  id: 8,
  code: 'WAI-0626',
  title: 'Jahreshauptversammlung',
  slug: 'jahreshauptversammlung',
  moderatorSub: 'entra:moderator',
  moderatorName: 'Moderator',
  viewerPasswordHash: '$argon2id$hash',
  status: 'live',
  livekitRoomName: 'tcw-present-wai-0626',
  startsAt: '2026-06-21',
  endedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

describe('end presentation route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSession).mockResolvedValue({ sub: 'entra:moderator', role: 'moderator', name: 'Moderator' })
    vi.mocked(getPresentationByCode).mockReturnValue(presentation)
    vi.mocked(canManagePresentation).mockReturnValue(true)
    vi.mocked(endPresentation).mockReturnValue({ ...presentation, status: 'ended', endedAt: 1_800_000_000_000 })
  })

  it('rejects anonymous requests', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const response = await POST(request(), params())

    expect(response.status).toBe(401)
    expect(endPresentation).not.toHaveBeenCalled()
    expect(closeLiveKitRoom).not.toHaveBeenCalled()
  })

  it('rejects presentations the session cannot manage', async () => {
    vi.mocked(canManagePresentation).mockReturnValue(false)

    const response = await POST(request(), params())

    expect(response.status).toBe(404)
    expect(endPresentation).not.toHaveBeenCalled()
    expect(closeLiveKitRoom).not.toHaveBeenCalled()
  })

  it('ends the presentation and closes the LiveKit room', async () => {
    const response = await POST(request(), params())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(endPresentation).toHaveBeenCalledWith('WAI-0626')
    expect(closeLiveKitRoom).toHaveBeenCalledWith(expect.objectContaining({ status: 'ended' }))
    expect(body.presentation.status).toBe('ended')
  })
})

function request(): NextRequest {
  return new NextRequest('http://localhost:3003/api/presentations/WAI-0626/end', { method: 'POST' })
}

function params() {
  return { params: Promise.resolve({ code: 'WAI-0626' }) }
}
