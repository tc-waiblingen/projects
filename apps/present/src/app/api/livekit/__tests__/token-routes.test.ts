// @vitest-environment node
import { getSession } from '@/lib/auth'
import { createModeratorToken, createViewerToken, getLiveKitConfig } from '@/lib/livekit'
import { canManagePresentation, getPresentationByCode, type Presentation } from '@/lib/presentations'
import { getViewerSession } from '@/lib/viewer-auth'
import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as moderatorTokenPost } from '../moderator-token/route'
import { POST as viewerTokenPost } from '../viewer-token/route'

vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/viewer-auth', () => ({ getViewerSession: vi.fn() }))
vi.mock('@/lib/presentations', () => ({
  canManagePresentation: vi.fn(),
  getPresentationByCode: vi.fn(),
}))
vi.mock('@/lib/livekit', () => ({
  createModeratorToken: vi.fn(async () => 'moderator-token'),
  createViewerToken: vi.fn(async () => 'viewer-token'),
  getLiveKitConfig: vi.fn(() => ({ url: 'ws://localhost:7880', apiUrl: 'http://localhost:7880', apiKey: 'devkey', apiSecret: 'secret' })),
}))

const presentation: Presentation = {
  id: 7,
  code: 'WAI-0626',
  title: 'Jahreshauptversammlung',
  slug: 'jahreshauptversammlung',
  moderatorSub: 'entra:moderator',
  moderatorName: 'Moderator',
  viewerPasswordHash: 'hash',
  status: 'live',
  livekitRoomName: 'tcw-present-wai-0626',
  startsAt: null,
  endedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

describe('LiveKit token routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getLiveKitConfig).mockReturnValue({
      url: 'ws://localhost:7880',
      apiUrl: 'http://localhost:7880',
      apiKey: 'devkey',
      apiSecret: 'secret',
    })
  })

  it('rejects anonymous moderator token requests', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const response = await moderatorTokenPost(jsonRequest({ code: 'WAI-0626' }))

    expect(response.status).toBe(401)
  })

  it('rejects moderator token requests without a code', async () => {
    vi.mocked(getSession).mockResolvedValue({ sub: 'entra:moderator', role: 'moderator' })

    const response = await moderatorTokenPost(jsonRequest({}))

    expect(response.status).toBe(400)
    expect(createModeratorToken).not.toHaveBeenCalled()
  })

  it('rejects moderator token requests for presentations the session cannot manage', async () => {
    vi.mocked(getSession).mockResolvedValue({ sub: 'entra:other', role: 'moderator' })
    vi.mocked(getPresentationByCode).mockReturnValue(presentation)
    vi.mocked(canManagePresentation).mockReturnValue(false)

    const response = await moderatorTokenPost(jsonRequest({ code: 'WAI-0626' }))

    expect(response.status).toBe(404)
  })

  it('rejects moderator token requests for ended presentations', async () => {
    vi.mocked(getSession).mockResolvedValue({ sub: 'entra:moderator', role: 'moderator' })
    vi.mocked(getPresentationByCode).mockReturnValue({ ...presentation, status: 'ended' })
    vi.mocked(canManagePresentation).mockReturnValue(true)

    const response = await moderatorTokenPost(jsonRequest({ code: 'WAI-0626' }))

    expect(response.status).toBe(409)
    expect(createModeratorToken).not.toHaveBeenCalled()
  })

  it('returns moderator tokens without exposing LiveKit server credentials', async () => {
    vi.mocked(getSession).mockResolvedValue({ sub: 'entra:moderator', role: 'moderator', name: 'Moderator' })
    vi.mocked(getPresentationByCode).mockReturnValue(presentation)
    vi.mocked(canManagePresentation).mockReturnValue(true)

    const response = await moderatorTokenPost(jsonRequest({ code: 'WAI-0626' }))
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(body).toEqual({ token: 'moderator-token', url: 'ws://localhost:7880', room: 'tcw-present-wai-0626' })
    expect(body).not.toHaveProperty('apiKey')
    expect(body).not.toHaveProperty('apiSecret')
    expect(createModeratorToken).toHaveBeenCalledWith(presentation, 'moderator:entra:moderator', 'Moderator')
  })

  it('rejects viewer token requests without a code', async () => {
    const response = await viewerTokenPost(jsonRequest({}))

    expect(response.status).toBe(400)
    expect(createViewerToken).not.toHaveBeenCalled()
  })

  it('rejects viewer token requests before password login', async () => {
    vi.mocked(getViewerSession).mockResolvedValue(null)

    const response = await viewerTokenPost(jsonRequest({ code: 'WAI-0626' }))

    expect(response.status).toBe(401)
    expect(getViewerSession).toHaveBeenCalledWith('WAI-0626')
  })

  it('rejects viewer token requests for ended presentations', async () => {
    vi.mocked(getViewerSession).mockResolvedValue({ presentationId: 7, code: 'WAI-0626', viewerId: 'viewer:7:abc' })
    vi.mocked(getPresentationByCode).mockReturnValue({ ...presentation, status: 'ended' })

    const response = await viewerTokenPost(jsonRequest({ code: 'WAI-0626' }))

    expect(response.status).toBe(409)
  })

  it('rejects viewer token requests before the presentation is live', async () => {
    vi.mocked(getViewerSession).mockResolvedValue({ presentationId: 7, code: 'WAI-0626', viewerId: 'viewer:7:abc' })
    vi.mocked(getPresentationByCode).mockReturnValue({ ...presentation, status: 'ready' })

    const response = await viewerTokenPost(jsonRequest({ code: 'WAI-0626' }))
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(409)
    expect(body.error).toBe('Presentation is not live')
    expect(createViewerToken).not.toHaveBeenCalled()
  })

  it('returns a waiting response for viewer polling before the presentation is live', async () => {
    vi.mocked(getViewerSession).mockResolvedValue({ presentationId: 7, code: 'WAI-0626', viewerId: 'viewer:7:abc' })
    vi.mocked(getPresentationByCode).mockReturnValue({ ...presentation, status: 'ready' })

    const response = await viewerTokenPost(jsonRequest({ code: 'WAI-0626', wait: true }))
    const body = (await response.json()) as { status: string }

    expect(response.status).toBe(200)
    expect(body).toEqual({ status: 'waiting' })
    expect(createViewerToken).not.toHaveBeenCalled()
  })

  it('returns ended for viewer polling after the presentation ended', async () => {
    vi.mocked(getViewerSession).mockResolvedValue({ presentationId: 7, code: 'WAI-0626', viewerId: 'viewer:7:abc' })
    vi.mocked(getPresentationByCode).mockReturnValue({ ...presentation, status: 'ended' })

    const response = await viewerTokenPost(jsonRequest({ code: 'WAI-0626', wait: true }))
    const body = (await response.json()) as { status: string }

    expect(response.status).toBe(200)
    expect(body).toEqual({ status: 'ended' })
    expect(createViewerToken).not.toHaveBeenCalled()
  })

  it('returns subscribe-only viewer tokens after password login', async () => {
    vi.mocked(getViewerSession).mockResolvedValue({ presentationId: 7, code: 'WAI-0626', viewerId: 'viewer:7:abc' })
    vi.mocked(getPresentationByCode).mockReturnValue(presentation)

    const response = await viewerTokenPost(jsonRequest({ code: 'WAI-0626' }))
    const body = (await response.json()) as { token: string; url: string; room: string }

    expect(response.status).toBe(200)
    expect(body).toEqual({ token: 'viewer-token', url: 'ws://localhost:7880', room: 'tcw-present-wai-0626' })
    expect(body).not.toHaveProperty('apiKey')
    expect(body).not.toHaveProperty('apiSecret')
    expect(getViewerSession).toHaveBeenCalledWith('WAI-0626')
    expect(createViewerToken).toHaveBeenCalledWith(presentation, 'viewer:7:abc')
  })
})

function jsonRequest(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost/api/livekit/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest
}
