// @vitest-environment node
import { getSession } from '@/lib/auth'
import { canManagePresentation, getPresentationByCode, updatePresentation, type Presentation } from '@/lib/presentations'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'

vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/presentations', () => ({
  canManagePresentation: vi.fn(),
  getPresentationByCode: vi.fn(),
  updatePresentation: vi.fn(),
}))

const presentation: Presentation = {
  id: 8,
  code: 'WAI-0626',
  title: 'Jahreshauptversammlung',
  slug: 'jahreshauptversammlung',
  moderatorSub: 'entra:moderator',
  moderatorName: 'Moderator',
  viewerPasswordHash: '$argon2id$hash',
  status: 'draft',
  livekitRoomName: 'tcw-present-wai-0626',
  startsAt: '2026-06-21',
  endedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

describe('presentation update route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSession).mockResolvedValue({ sub: 'entra:moderator', role: 'moderator', name: 'Moderator' })
    vi.mocked(getPresentationByCode).mockReturnValue(presentation)
    vi.mocked(canManagePresentation).mockReturnValue(true)
    vi.mocked(updatePresentation).mockResolvedValue({ ...presentation, status: 'ready' })
  })

  it('rejects anonymous update requests', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const response = await POST(formRequest({ title: 'Updated title' }), params())

    expect(response.status).toBe(401)
    expect(updatePresentation).not.toHaveBeenCalled()
  })

  it('rejects updates for presentations the session cannot manage', async () => {
    vi.mocked(canManagePresentation).mockReturnValue(false)

    const response = await POST(formRequest({ title: 'Updated title' }), params())

    expect(response.status).toBe(404)
    expect(updatePresentation).not.toHaveBeenCalled()
  })

  it('updates editable fields and redirects back to edit', async () => {
    const response = await POST(formRequest({
      title: ' Updated title ',
      startsAt: '2026-07-01',
      viewerPassword: ' new-pass ',
      status: 'ready',
    }), params())

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3003/presentations/WAI-0626/edit')
    expect(updatePresentation).toHaveBeenCalledWith('WAI-0626', {
      title: 'Updated title',
      startsAt: '2026-07-01',
      viewerPassword: 'new-pass',
      status: 'ready',
    })
  })

  it('does not forward invalid status or blank optional fields', async () => {
    const response = await POST(formRequest({
      title: 'Updated title',
      startsAt: '',
      viewerPassword: '',
      status: 'live',
    }), params())

    expect(response.status).toBe(303)
    expect(updatePresentation).toHaveBeenCalledWith('WAI-0626', {
      title: 'Updated title',
      startsAt: undefined,
      viewerPassword: undefined,
      status: undefined,
    })
  })
})

function formRequest(fields: Record<string, string>): NextRequest {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value)
  }
  return new NextRequest('http://localhost:3003/api/presentations/WAI-0626', {
    method: 'POST',
    body: form,
  })
}

function params() {
  return { params: Promise.resolve({ code: 'WAI-0626' }) }
}
