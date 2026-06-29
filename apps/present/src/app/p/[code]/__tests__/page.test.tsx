// @vitest-environment node
import { getPresentationByCode, type Presentation } from '@/lib/presentations'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ViewerLoginPage from '../page'

vi.mock('@/lib/presentations', () => ({ getPresentationByCode: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
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

describe('viewer login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPresentationByCode).mockReturnValue(presentation)
  })

  it('renders a password-only viewer login form', async () => {
    const element = await ViewerLoginPage({
      params: Promise.resolve({ code: 'WAI-0626' }),
      searchParams: Promise.resolve({}),
    })
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('Jahreshauptversammlung')
    expect(markup).toContain('WAI-0626')
    expect(markup).toContain('name="password"')
    expect(markup).toContain('type="password"')
    expect(markup).toContain('name="code"')
    expect(markup.toLowerCase()).toContain('autocomplete="off"')
    expect(markup).not.toContain('required=""')
    expect(markup).not.toContain('name="username"')
    expect(markup).not.toContain('name="email"')
  })

  it('shows a password error without adding any username field', async () => {
    const element = await ViewerLoginPage({
      params: Promise.resolve({ code: 'WAI-0626' }),
      searchParams: Promise.resolve({ error: '1' }),
    })
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('Wrong password.')
    expect(markup).not.toContain('name="username"')
    expect(markup).not.toContain('name="email"')
  })

  it('does not render a login form after the presentation ended', async () => {
    vi.mocked(getPresentationByCode).mockReturnValue({ ...presentation, status: 'ended' })

    const element = await ViewerLoginPage({
      params: Promise.resolve({ code: 'WAI-0626' }),
      searchParams: Promise.resolve({}),
    })
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('This presentation has ended.')
    expect(markup).not.toContain('name="password"')
    expect(markup).not.toContain('Join presentation')
  })

  it('returns not found for unknown presentation codes', async () => {
    vi.mocked(getPresentationByCode).mockReturnValue(null)

    await expect(ViewerLoginPage({
      params: Promise.resolve({ code: 'UNKNOWN' }),
      searchParams: Promise.resolve({}),
    })).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
