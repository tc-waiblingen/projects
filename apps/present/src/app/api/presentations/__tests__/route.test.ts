// @vitest-environment node
import { getSession } from '@/lib/auth'
import { createPresentation, type Presentation } from '@/lib/presentations'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'

vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/presentations', () => ({ createPresentation: vi.fn() }))

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

describe('presentation create route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSession).mockResolvedValue({ sub: 'entra:moderator', role: 'moderator', name: 'Moderator' })
    vi.mocked(createPresentation).mockResolvedValue(presentation)
  })

  it('rejects anonymous creation requests', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const response = await POST(formRequest({ title: 'Jahreshauptversammlung' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(createPresentation).not.toHaveBeenCalled()
  })

  it('creates a reserved presentation code for the authenticated moderator', async () => {
    const response = await POST(formRequest({
      title: ' Jahreshauptversammlung ',
      code: ' wai-0626 ',
      startsAt: '2026-06-21',
      viewerPassword: 'secret-pass',
    }))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('http://localhost:3003/presentations/WAI-0626/edit')
    expect(createPresentation).toHaveBeenCalledWith({
      title: 'Jahreshauptversammlung',
      code: 'wai-0626',
      startsAt: '2026-06-21',
      viewerPassword: 'secret-pass',
      moderator: { sub: 'entra:moderator', name: 'Moderator' },
    })
  })
})

function formRequest(fields: Record<string, string>): NextRequest {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value)
  }
  return new NextRequest('http://localhost:3003/api/presentations', {
    method: 'POST',
    body: form,
  })
}
