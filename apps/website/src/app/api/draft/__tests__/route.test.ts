import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { GET } from '../route'

vi.mock('next/headers', () => ({
  draftMode: vi.fn(async () => ({ enable: vi.fn() })),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('@/lib/directus/fetchers', () => ({
  fetchPostForPreview: vi.fn(),
}))

function request(params: Record<string, string>) {
  const query = new URLSearchParams({ secret: 'test-secret', ...params })
  return new NextRequest(`https://example.com/api/draft?${query}`)
}

describe('GET /api/draft', () => {
  beforeEach(() => {
    vi.stubEnv('DRAFT_MODE_SECRET', 'test-secret')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('redirects the home page permalink without a double slash', async () => {
    await GET(request({ collection: 'pages', slug: '/', version: 'published' }))
    expect(redirect).toHaveBeenCalledWith('/?version=published')
  })

  it('redirects nested page permalinks without a double slash', async () => {
    await GET(request({ collection: 'pages', slug: '/verein/vorstand' }))
    expect(redirect).toHaveBeenCalledWith('/verein/vorstand')
  })
})
