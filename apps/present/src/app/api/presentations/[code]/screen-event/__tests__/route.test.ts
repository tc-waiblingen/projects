// @vitest-environment node
import { getSession } from '@/lib/auth'
import { canManagePresentation, getPresentationByCode, logPresentationEvent, type Presentation } from '@/lib/presentations'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'

vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/presentations', () => ({
  canManagePresentation: vi.fn(),
  getPresentationByCode: vi.fn(),
  logPresentationEvent: vi.fn(),
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

describe('presentation screen event route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSession).mockResolvedValue({ sub: 'entra:moderator', role: 'moderator', name: 'Moderator' })
    vi.mocked(getPresentationByCode).mockReturnValue(presentation)
    vi.mocked(canManagePresentation).mockReturnValue(true)
  })

  it('rejects anonymous requests', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const response = await POST(jsonRequest({ type: 'screen_started' }), params())

    expect(response.status).toBe(401)
    expect(logPresentationEvent).not.toHaveBeenCalled()
  })

  it('rejects presentations the moderator cannot manage', async () => {
    vi.mocked(canManagePresentation).mockReturnValue(false)

    const response = await POST(jsonRequest({ type: 'screen_started' }), params())

    expect(response.status).toBe(404)
    expect(logPresentationEvent).not.toHaveBeenCalled()
  })

  it('rejects screen events after the presentation ended', async () => {
    vi.mocked(getPresentationByCode).mockReturnValue({ ...presentation, status: 'ended' })

    const response = await POST(jsonRequest({ type: 'screen_started' }), params())

    expect(response.status).toBe(409)
    expect(logPresentationEvent).not.toHaveBeenCalled()
  })

  it('rejects invalid event types', async () => {
    const response = await POST(jsonRequest({ type: 'viewer_joined' }), params())

    expect(response.status).toBe(400)
    expect(logPresentationEvent).not.toHaveBeenCalled()
  })

  it('logs screen start events', async () => {
    const response = await POST(jsonRequest({ type: 'screen_started' }), params())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(logPresentationEvent).toHaveBeenCalledWith(8, 'screen_started', null)
  })

  it('logs screen change events', async () => {
    const response = await POST(jsonRequest({ type: 'screen_changed' }), params())

    expect(response.status).toBe(200)
    expect(logPresentationEvent).toHaveBeenCalledWith(8, 'screen_changed', null)
  })
})

function jsonRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3003/api/presentations/WAI-0626/screen-event', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function params() {
  return { params: Promise.resolve({ code: 'WAI-0626' }) }
}
