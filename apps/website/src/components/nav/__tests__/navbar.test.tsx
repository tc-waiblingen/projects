import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getHeaderNavigation } from '@/lib/directus/fetchers'
import type { Navigation } from '@/types/directus-schema'
import { Navbar } from '../navbar'

vi.mock('@/lib/directus/fetchers', () => ({
  getHeaderNavigation: vi.fn(),
}))

const navMain = {
  id: 'main',
  title: 'Main',
  items: [
    { id: 'verein', title: 'Verein', type: 'page', page: { permalink: '/verein' } },
    { id: 'news', title: 'News', type: 'url', url: '/news' },
  ],
} as unknown as Navigation

const navCTA = {
  id: 'cta',
  title: 'CTA',
  items: [{ id: 'mitglied', title: 'Mitglied werden', type: 'page', page: { permalink: '/mitglied-werden' } }],
} as unknown as Navigation

async function renderNavbar(currentPath?: string) {
  const element = await Navbar({ currentPath })
  return render(<>{element}</>)
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_VISUAL_EDITING', 'true')
    vi.mocked(getHeaderNavigation).mockResolvedValue({ navMain, navCTA })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('marks the link matching the current path as active', async () => {
    await renderNavbar('/verein/vorstand')

    expect(screen.getByRole('link', { name: 'Verein' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'News' })).not.toHaveAttribute('aria-current')
  })

  it('adds visual editing attributes for both navigation collections', async () => {
    const { container } = await renderNavbar()

    expect(container.querySelector('[data-directus^="collection:navigation;item:main;"]')).not.toBeNull()
    expect(container.querySelector('[data-directus^="collection:navigation;item:cta;"]')).not.toBeNull()
  })
})
