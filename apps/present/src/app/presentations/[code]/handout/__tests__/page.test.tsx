// @vitest-environment node
import { getSession } from '@/lib/auth'
import { canManagePresentation, getPresentationByCode, type Presentation } from '@/lib/presentations'
import { createQrDataUrl } from '@/lib/qr'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HandoutPage from '../page'

vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/presentations', () => ({
  canManagePresentation: vi.fn(),
  getPresentationByCode: vi.fn(),
}))
vi.mock('@/lib/qr', () => ({ createQrDataUrl: vi.fn(async () => 'data:image/png;base64,qr') }))
vi.mock('next/image', () => ({
  default: (props: { src: string; alt: string; width: number; height: number; className?: string }) =>
    createElement('img', props),
}))

const presentation: Presentation = {
  id: 3,
  code: 'WAI-0626',
  title: 'Jahreshauptversammlung',
  slug: 'jahreshauptversammlung',
  moderatorSub: 'entra:moderator',
  moderatorName: 'Moderator',
  viewerPasswordHash: '$argon2id$stored-hash',
  status: 'ready',
  livekitRoomName: 'tcw-present-wai-0626',
  startsAt: '2026-06-21',
  endedAt: null,
  createdAt: 1,
  updatedAt: 1,
}

describe('handout page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('PRESENT_PUBLIC_URL', 'https://present.tc-waiblingen.de')
    vi.mocked(getSession).mockResolvedValue({ sub: 'entra:moderator', role: 'moderator', name: 'Moderator' })
    vi.mocked(getPresentationByCode).mockReturnValue(presentation)
    vi.mocked(canManagePresentation).mockReturnValue(true)
  })

  it('renders a print-friendly handout with a QR code for the viewer URL', async () => {
    const element = await HandoutPage({ params: Promise.resolve({ code: 'WAI-0626' }) })
    const markup = renderToStaticMarkup(element)

    expect(createQrDataUrl).toHaveBeenCalledWith('https://present.tc-waiblingen.de/p/WAI-0626', 420)
    expect(markup).toContain('Jahreshauptversammlung')
    expect(markup).toContain('https://present.tc-waiblingen.de/p/WAI-0626')
    expect(markup).toContain('WAI-0626')
    expect(markup).toContain('Viewer password for printed handout')
    expect(markup).toContain('Enter before printing')
    expect(markup).not.toContain('$argon2id$stored-hash')
  })
})
