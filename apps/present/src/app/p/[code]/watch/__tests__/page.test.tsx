// @vitest-environment node
import { getPresentationByCode, type Presentation } from '@/lib/presentations'
import { getViewerSession } from '@/lib/viewer-auth'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WatchPage from '../page'

vi.mock('@/components/livekit/ViewerRoom', () => ({
  ViewerRoom: ({ code, title, initialStatus }: { code: string; initialStatus: string; title: string }) => (
    <div data-code={code} data-status={initialStatus}>{title}</div>
  ),
}))
vi.mock('@/lib/presentations', () => ({ getPresentationByCode: vi.fn() }))
vi.mock('@/lib/viewer-auth', () => ({ getViewerSession: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
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

describe('viewer watch page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPresentationByCode).mockReturnValue(presentation)
    vi.mocked(getViewerSession).mockResolvedValue({
      presentationId: 8,
      code: 'WAI-0626',
      viewerId: 'viewer:8:abc',
    })
  })

  it('renders the viewer room for a valid password session', async () => {
    const element = await WatchPage({ params: Promise.resolve({ code: 'WAI-0626' }) })
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('data-code="WAI-0626"')
    expect(markup).toContain('data-status="live"')
    expect(markup).toContain('Jahreshauptversammlung')
    expect(getViewerSession).toHaveBeenCalledWith('WAI-0626')
  })

  it('redirects to the password page without a viewer session', async () => {
    vi.mocked(getViewerSession).mockResolvedValue(null)

    await expect(WatchPage({ params: Promise.resolve({ code: 'WAI-0626' }) })).rejects.toThrow(
      'NEXT_REDIRECT:/p/WAI-0626',
    )
  })

  it('redirects to the password page for a mismatched presentation session', async () => {
    vi.mocked(getViewerSession).mockResolvedValue({
      presentationId: 99,
      code: 'OTHER',
      viewerId: 'viewer:99:abc',
    })

    await expect(WatchPage({ params: Promise.resolve({ code: 'WAI-0626' }) })).rejects.toThrow(
      'NEXT_REDIRECT:/p/WAI-0626',
    )
  })

  it('passes ended status through to the viewer room for already-authenticated viewers', async () => {
    vi.mocked(getPresentationByCode).mockReturnValue({ ...presentation, status: 'ended' })

    const element = await WatchPage({ params: Promise.resolve({ code: 'WAI-0626' }) })
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('data-status="ended"')
  })

  it('returns not found for unknown presentation codes', async () => {
    vi.mocked(getPresentationByCode).mockReturnValue(null)

    await expect(WatchPage({ params: Promise.resolve({ code: 'UNKNOWN' }) })).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
