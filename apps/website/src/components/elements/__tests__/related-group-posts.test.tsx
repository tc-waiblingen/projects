import { render, screen } from '@testing-library/react'
import { draftMode } from 'next/headers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPostGroupWithPosts } from '@/lib/directus/fetchers'
import { RelatedGroupPosts } from '../related-group-posts'

vi.mock('next/headers', () => ({
  draftMode: vi.fn(),
}))

vi.mock('@/lib/directus/fetchers', () => ({
  fetchPostGroupWithPosts: vi.fn(),
}))

const publishedPost = {
  id: 'current-post',
  title: 'Current post',
  slug: 'current-post',
  published_at: '2026-01-15T10:00:00.000Z',
  status: 'published' as const,
}

const otherPost = {
  id: 'other-post',
  title: 'Other post',
  slug: 'other-post',
  published_at: '2026-01-16T10:00:00.000Z',
  status: 'published' as const,
}

type GroupResult = Awaited<ReturnType<typeof fetchPostGroupWithPosts>>

function mockGroupResult(
  overrides: { group?: Partial<GroupResult['group']>; posts?: GroupResult['posts'] } = {}
): GroupResult {
  return {
    group: {
      id: 1,
      status: 'published',
      name: 'Sommer-Serie',
      description: null,
      posts_direction: 'oldest_first',
      ...overrides.group,
    },
    posts: overrides.posts ?? [publishedPost],
  }
}

async function renderRelatedGroupPosts() {
  const element = await RelatedGroupPosts({
    groupId: 1,
    currentPostId: publishedPost.id,
  })

  return render(<>{element}</>)
}

describe('RelatedGroupPosts', () => {
  const mockDraftMode = vi.mocked(draftMode)
  const mockFetchPostGroupWithPosts = vi.mocked(fetchPostGroupWithPosts)

  beforeEach(() => {
    mockDraftMode.mockResolvedValue({ isEnabled: false } as Awaited<ReturnType<typeof draftMode>>)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing for a single post without a meaningful group description', async () => {
    mockFetchPostGroupWithPosts.mockResolvedValue(
      mockGroupResult({
        group: {
          description: '<p><br></p>',
        },
      })
    )

    const { container } = await renderRelatedGroupPosts()

    expect(container).toBeEmptyDOMElement()
  })

  it('renders a single-post group when it has a meaningful description', async () => {
    mockFetchPostGroupWithPosts.mockResolvedValue(
      mockGroupResult({
        group: {
          description: '<p>Alle Infos zur Sommer-Serie.</p>',
        },
      })
    )

    await renderRelatedGroupPosts()

    expect(screen.getByRole('heading', { name: 'Sommer-Serie' })).toBeInTheDocument()
    expect(screen.getByText('Alle Infos zur Sommer-Serie.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('still renders a multi-post group without a description', async () => {
    mockFetchPostGroupWithPosts.mockResolvedValue(
      mockGroupResult({
        posts: [publishedPost, otherPost],
      })
    )

    await renderRelatedGroupPosts()

    expect(screen.getByRole('heading', { name: 'Weitere Beiträge in dieser Serie' })).toBeInTheDocument()
    expect(screen.getByText('Current post')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Other post' })).toHaveAttribute('href', '/news/2026/other-post')
  })

  it('hides non-published groups outside preview', async () => {
    mockFetchPostGroupWithPosts.mockResolvedValue(
      mockGroupResult({
        group: {
          status: 'draft',
          description: '<p>Interne Beschreibung.</p>',
        },
        posts: [publishedPost, otherPost],
      })
    )

    const { container } = await renderRelatedGroupPosts()

    expect(container).toBeEmptyDOMElement()
  })

  it('allows non-published groups in preview', async () => {
    mockDraftMode.mockResolvedValue({ isEnabled: true } as Awaited<ReturnType<typeof draftMode>>)
    mockFetchPostGroupWithPosts.mockResolvedValue(
      mockGroupResult({
        group: {
          status: 'draft',
          description: '<p>Interne Beschreibung.</p>',
        },
      })
    )

    await renderRelatedGroupPosts()

    expect(screen.getByRole('heading', { name: 'Sommer-Serie' })).toBeInTheDocument()
    expect(screen.getByText('Interne Beschreibung.')).toBeInTheDocument()
  })
})
