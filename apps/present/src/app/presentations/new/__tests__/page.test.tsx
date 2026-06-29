// @vitest-environment node
import { getDb } from '@/lib/db'
import { generatePresentationCode, reservePresentationCode } from '@/lib/presentation-code'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NewPresentationPage from '../page'

vi.mock('@/components/presentations/AdminShell', () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div data-shell="admin">{children}</div>,
}))
vi.mock('@/lib/db', () => ({ getDb: vi.fn() }))
vi.mock('@/lib/presentation-code', () => ({
  generatePresentationCode: vi.fn(),
  reservePresentationCode: vi.fn(),
}))

describe('new presentation page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDb).mockReturnValue({} as ReturnType<typeof getDb>)
    vi.mocked(generatePresentationCode).mockReturnValue('WAI-0626')
    vi.mocked(reservePresentationCode).mockReturnValue('WAI-06262')
  })

  it('pre-fills the create form with a unique suggested presentation code', () => {
    const element = <NewPresentationPage />
    const markup = renderToStaticMarkup(element)

    expect(reservePresentationCode).toHaveBeenCalledWith({}, 'WAI-0626')
    expect(markup).toContain('value="WAI-06262"')
  })
})
