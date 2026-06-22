// @vitest-environment node
import { canManagePresentation, getPresentationByCode, type Presentation } from '@/lib/presentations'
import { getSession } from '@/lib/auth'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EditPresentationPage from '../page'

vi.mock('@/components/presentations/AdminShell', () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div data-shell="admin">{children}</div>,
}))
vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/presentations', () => ({
  canManagePresentation: vi.fn(),
  getPresentationByCode: vi.fn(),
}))
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
  status: 'ready',
  livekitRoomName: 'tcw-present-wai-0626',
  startsAt: '2026-06-21',
  endedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

describe('edit presentation page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSession).mockResolvedValue({ sub: 'entra:moderator', role: 'moderator', name: 'Moderator' })
    vi.mocked(getPresentationByCode).mockReturnValue(presentation)
    vi.mocked(canManagePresentation).mockReturnValue(true)
  })

  it('redirects anonymous moderators to login', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    await expect(EditPresentationPage({ params: Promise.resolve({ code: 'WAI-0626' }) })).rejects.toThrow(
      'NEXT_REDIRECT:/login',
    )
  })

  it('returns not found when the presentation cannot be managed', async () => {
    vi.mocked(canManagePresentation).mockReturnValue(false)

    await expect(EditPresentationPage({ params: Promise.resolve({ code: 'WAI-0626' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
  })

  it('renders edit form actions for the selected presentation', async () => {
    const element = await EditPresentationPage({ params: Promise.resolve({ code: 'WAI-0626' }) })
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('Edit presentation')
    expect(markup).toContain('action="/api/presentations/WAI-0626"')
    expect(markup).toContain('href="/moderator/WAI-0626"')
    expect(markup).toContain('href="/presentations/WAI-0626/handout"')
    expect(markup).not.toContain('$argon2id$hash')
  })
})
