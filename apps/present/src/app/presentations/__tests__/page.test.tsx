// @vitest-environment node
import { getSession } from '@/lib/auth'
import { listPresentationsForModerator, type Presentation } from '@/lib/presentations'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PresentationsPage from '../page'

vi.mock('@/components/presentations/AdminShell', () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div data-shell="admin">{children}</div>,
}))
vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/presentations', () => ({ listPresentationsForModerator: vi.fn() }))
vi.mock('next/navigation', () => ({
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

describe('presentations list page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSession).mockResolvedValue({ sub: 'entra:moderator', role: 'moderator', name: 'Moderator' })
    vi.mocked(listPresentationsForModerator).mockReturnValue([presentation])
  })

  it('redirects anonymous moderators to login', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    await expect(PresentationsPage()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('lists presentations for the current moderator with control links', async () => {
    const element = await PresentationsPage()
    const markup = renderToStaticMarkup(element)

    expect(listPresentationsForModerator).toHaveBeenCalledWith('entra:moderator', 'moderator')
    expect(markup).toContain('Screen sharing sessions')
    expect(markup).toContain('New presentation')
    expect(markup).toContain('Jahreshauptversammlung')
    expect(markup).toContain('WAI-0626')
    expect(markup).toContain('Ready')
    expect(markup).toContain('href="/presentations/WAI-0626/edit"')
    expect(markup).toContain('href="/moderator/WAI-0626"')
    expect(markup).not.toContain('$argon2id$hash')
  })

  it('renders an empty state', async () => {
    vi.mocked(listPresentationsForModerator).mockReturnValue([])

    const element = await PresentationsPage()
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('No presentations yet.')
  })
})
