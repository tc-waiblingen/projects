// @vitest-environment node
import type { Presentation } from '@/lib/presentations'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PresentationForm } from '../PresentationForm'

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

describe('PresentationForm', () => {
  it('renders the create form for reserving a presentation code', () => {
    const markup = renderToStaticMarkup(<PresentationForm />)

    expect(markup).toContain('action="/api/presentations"')
    expect(markup).toContain('name="title"')
    expect(markup).toContain('name="code"')
    expect(markup).toContain('placeholder="WAI-0626"')
    expect(markup).toContain('name="viewerPassword"')
    expect(markup).toContain('Create presentation')
    expect(markup).not.toContain('Open control room')
    expect(markup).not.toContain('Handout')
  })

  it('renders edit controls without exposing the stored password hash', () => {
    const markup = renderToStaticMarkup(<PresentationForm presentation={presentation} />)

    expect(markup).toContain('action="/api/presentations/WAI-0626"')
    expect(markup).toContain('value="Jahreshauptversammlung"')
    expect(markup).toContain('value="WAI-0626"')
    expect(markup).toContain('disabled=""')
    expect(markup).toContain('Leave empty to keep current password')
    expect(markup).toContain('Open control room')
    expect(markup).toContain('href="/moderator/WAI-0626"')
    expect(markup).toContain('Handout')
    expect(markup).toContain('href="/presentations/WAI-0626/handout"')
    expect(markup).not.toContain('$argon2id$hash')
  })
})
