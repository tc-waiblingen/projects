import { describe, expect, it } from 'vitest'
import { GetLinkHref, getNavItemHref, getPostPath, isActiveLink } from '../dynamic-link-helper'
import type { Page, Post, DirectusFile, NavigationItem } from '@/types/directus-schema'

describe('GetLinkHref', () => {
  describe('type: url', () => {
    it('returns the URL when type is url', () => {
      const result = GetLinkHref({
        type: 'url',
        url: 'https://example.com',
      })
      expect(result).toBe('https://example.com')
    })

    it('returns null when URL is null', () => {
      const result = GetLinkHref({
        type: 'url',
        url: null,
      })
      expect(result).toBeNull()
    })

    it('returns null when URL is undefined', () => {
      const result = GetLinkHref({
        type: 'url',
      })
      expect(result).toBeNull()
    })
  })

  describe('type: page', () => {
    it('returns permalink when page has permalink', () => {
      const page: Partial<Page> = {
        id: '123',
        permalink: '/about-us',
      }
      const result = GetLinkHref({
        type: 'page',
        page: page as Page,
      })
      expect(result).toBe('/about-us')
    })

    it('returns null when page is a string (ID only)', () => {
      const result = GetLinkHref({
        type: 'page',
        page: 'page-id-123',
      })
      expect(result).toBeNull()
    })

    it('returns null when page has no permalink', () => {
      const page: Partial<Page> = {
        id: '123',
      }
      const result = GetLinkHref({
        type: 'page',
        page: page as Page,
      })
      expect(result).toBeNull()
    })

    it('returns null when page is null', () => {
      const result = GetLinkHref({
        type: 'page',
        page: null,
      })
      expect(result).toBeNull()
    })
  })

  describe('type: post', () => {
    it('returns correct path for post with slug and published_at', () => {
      const post: Partial<Post> = {
        id: '456',
        slug: 'my-blog-post',
        published_at: '2024-06-15T10:00:00Z',
      }
      const result = GetLinkHref({
        type: 'post',
        post: post as Post,
      })
      expect(result).toBe('/news/2024/my-blog-post')
    })

    it('extracts year correctly from published_at', () => {
      const post: Partial<Post> = {
        id: '456',
        slug: 'new-year-post',
        published_at: '2025-01-01T00:00:00Z',
      }
      const result = GetLinkHref({
        type: 'post',
        post: post as Post,
      })
      expect(result).toBe('/news/2025/new-year-post')
    })

    it('returns null when post is a string (ID only)', () => {
      const result = GetLinkHref({
        type: 'post',
        post: 'post-id-456',
      })
      expect(result).toBeNull()
    })

    it('returns null when post has no slug', () => {
      const post: Partial<Post> = {
        id: '456',
        slug: null,
        published_at: '2024-06-15T10:00:00Z',
      }
      const result = GetLinkHref({
        type: 'post',
        post: post as Post,
      })
      expect(result).toBeNull()
    })

    it('falls back to undated path when post has no published_at', () => {
      const post: Partial<Post> = {
        id: '456',
        slug: 'my-post',
        published_at: null,
      }
      const result = GetLinkHref({
        type: 'post',
        post: post as Post,
      })
      expect(result).toBe('/news/my-post')
    })

    it('returns null when post is null', () => {
      const result = GetLinkHref({
        type: 'post',
        post: null,
      })
      expect(result).toBeNull()
    })
  })

  describe('type: file', () => {
    it('returns correct API path for file with id', () => {
      const file: Partial<DirectusFile> = {
        id: 'abc-123-def',
        filename_disk: 'document.pdf',
      }
      const result = GetLinkHref({
        type: 'file',
        file: file as DirectusFile,
      })
      expect(result).toBe('/api/files/abc-123-def')
    })

    it('returns null when file is a string (ID only)', () => {
      const result = GetLinkHref({
        type: 'file',
        file: 'file-id-123',
      })
      expect(result).toBeNull()
    })

    it('returns null when file has no id', () => {
      const file: Partial<DirectusFile> = {
        filename_disk: 'document.pdf',
      }
      const result = GetLinkHref({
        type: 'file',
        file: file as DirectusFile,
      })
      expect(result).toBeNull()
    })

    it('returns null when file is null', () => {
      const result = GetLinkHref({
        type: 'file',
        file: null,
      })
      expect(result).toBeNull()
    })
  })

  describe('type: null or undefined (default)', () => {
    it('returns url as fallback when type is null', () => {
      const result = GetLinkHref({
        type: null,
        url: 'https://fallback.com',
      })
      expect(result).toBe('https://fallback.com')
    })

    it('returns url as fallback when type is undefined', () => {
      const result = GetLinkHref({
        url: 'https://fallback.com',
      })
      expect(result).toBe('https://fallback.com')
    })

    it('returns null when type is undefined and no url', () => {
      const result = GetLinkHref({})
      expect(result).toBeNull()
    })
  })
})

describe('getPostPath', () => {
  it('includes the year when published_at is set', () => {
    expect(getPostPath('my-post', '2024-06-15T10:00:00Z')).toBe('/news/2024/my-post')
  })

  it('falls back to /news/{slug} when published_at is missing', () => {
    expect(getPostPath('my-post', null)).toBe('/news/my-post')
    expect(getPostPath('my-post')).toBe('/news/my-post')
  })
})

describe('getNavItemHref', () => {
  const item = (fields: Partial<NavigationItem>) => fields as Pick<NavigationItem, 'type' | 'url' | 'page' | 'post' | 'file'>

  it('returns the page permalink', () => {
    expect(getNavItemHref(item({ type: 'page', page: { permalink: '/verein' } as Page }))).toBe('/verein')
  })

  it('returns a dated post path without trailing slash', () => {
    const post = { slug: 'sommerfest', published_at: '2024-06-15T10:00:00Z' } as Post
    expect(getNavItemHref(item({ type: 'post', post }))).toBe('/news/2024/sommerfest')
  })

  it('returns an undated post path', () => {
    const post = { slug: 'sommerfest', published_at: null } as Post
    expect(getNavItemHref(item({ type: 'post', post }))).toBe('/news/sommerfest')
  })

  it('returns null for a post without slug', () => {
    const post = { slug: null, published_at: '2024-06-15T10:00:00Z' } as Post
    expect(getNavItemHref(item({ type: 'post', post }))).toBeNull()
  })

  it('returns null for a post given only as id', () => {
    expect(getNavItemHref(item({ type: 'post', post: 'post-id' }))).toBeNull()
  })

  it('returns null for groups and dividers', () => {
    expect(getNavItemHref(item({ type: 'group', url: '/x' }))).toBeNull()
    expect(getNavItemHref(item({ type: 'divider', url: '/x' }))).toBeNull()
  })

  it('returns null when type is missing, even with a url', () => {
    expect(getNavItemHref(item({ type: null, url: '/x' }))).toBeNull()
  })

  it('returns the url for url items', () => {
    expect(getNavItemHref(item({ type: 'url', url: 'https://example.com' }))).toBe('https://example.com')
  })

  it('returns the file API path for file items', () => {
    expect(getNavItemHref(item({ type: 'file', file: { id: 'abc' } as DirectusFile }))).toBe('/api/files/abc')
  })
})

describe('isActiveLink', () => {
  it('matches / only on /', () => {
    expect(isActiveLink('/', '/')).toBe(true)
    expect(isActiveLink('/', '/verein')).toBe(false)
  })

  it('matches exact paths', () => {
    expect(isActiveLink('/verein', '/verein')).toBe(true)
  })

  it('matches child paths', () => {
    expect(isActiveLink('/news', '/news/2024/sommerfest')).toBe(true)
  })

  it('does not match paths that only share a prefix', () => {
    expect(isActiveLink('/news', '/newsletter')).toBe(false)
  })
})
