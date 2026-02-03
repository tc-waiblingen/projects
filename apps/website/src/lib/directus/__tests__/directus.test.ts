import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { _testHelpers } from '../directus'

const { extractCollectionFromUrl, fetchRetryAndCache, RETRYABLE_STATUSES } = _testHelpers

describe('directus', () => {
  describe('extractCollectionFromUrl', () => {
    it('extracts collection from /items/{collection} path', () => {
      expect(extractCollectionFromUrl('/items/pages')).toBe('pages')
      expect(extractCollectionFromUrl('/items/posts')).toBe('posts')
      expect(extractCollectionFromUrl('/items/block_hero')).toBe('block_hero')
    })

    it('extracts collection from /items/{collection}/{id} path', () => {
      expect(extractCollectionFromUrl('/items/pages/123')).toBe('pages')
      expect(extractCollectionFromUrl('/items/posts/abc-def')).toBe('posts')
    })

    it('extracts collection from full URL', () => {
      expect(extractCollectionFromUrl('https://cms.example.com/items/pages')).toBe('pages')
      expect(extractCollectionFromUrl('https://cms.example.com/items/posts/123')).toBe('posts')
    })

    it('extracts collection from URL with query params', () => {
      expect(extractCollectionFromUrl('/items/pages?filter[status]=published')).toBe('pages')
    })

    it('handles URL object', () => {
      const url = new URL('https://cms.example.com/items/navigation')
      expect(extractCollectionFromUrl(url)).toBe('navigation')
    })

    it('returns null for non-items paths', () => {
      expect(extractCollectionFromUrl('/assets/123')).toBeNull()
      expect(extractCollectionFromUrl('/auth/login')).toBeNull()
      expect(extractCollectionFromUrl('/')).toBeNull()
    })

    it('returns null for empty or invalid paths', () => {
      expect(extractCollectionFromUrl('')).toBeNull()
      expect(extractCollectionFromUrl('/items/')).toBeNull()
    })
  })

  describe('RETRYABLE_STATUSES', () => {
    it('includes rate limit and server error statuses', () => {
      expect(RETRYABLE_STATUSES.has(429)).toBe(true) // Too Many Requests
      expect(RETRYABLE_STATUSES.has(502)).toBe(true) // Bad Gateway
      expect(RETRYABLE_STATUSES.has(503)).toBe(true) // Service Unavailable
      expect(RETRYABLE_STATUSES.has(504)).toBe(true) // Gateway Timeout
    })

    it('does not include client errors', () => {
      expect(RETRYABLE_STATUSES.has(400)).toBe(false)
      expect(RETRYABLE_STATUSES.has(401)).toBe(false)
      expect(RETRYABLE_STATUSES.has(403)).toBe(false)
      expect(RETRYABLE_STATUSES.has(404)).toBe(false)
    })

    it('does not include permanent server errors', () => {
      expect(RETRYABLE_STATUSES.has(500)).toBe(false)
    })
  })

  describe('fetchRetryAndCache', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'test')
    })

    afterEach(() => {
      global.fetch = originalFetch
      vi.unstubAllEnvs()
    })

    it('returns response on success', async () => {
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const result = await fetchRetryAndCache(0, 'https://example.com/items/pages')

      expect(result.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('retries on 429 status', async () => {
      const mockResponse429 = new Response('Too Many Requests', { status: 429 })
      const mockResponse200 = new Response(JSON.stringify({ data: 'test' }), { status: 200 })

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockResponse429)
        .mockResolvedValueOnce(mockResponse200)

      const result = await fetchRetryAndCache(0, 'https://example.com/items/pages')

      expect(result.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('retries on 502 status', async () => {
      const mockResponse502 = new Response('Bad Gateway', { status: 502 })
      const mockResponse200 = new Response(JSON.stringify({ data: 'test' }), { status: 200 })

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockResponse502)
        .mockResolvedValueOnce(mockResponse200)

      const result = await fetchRetryAndCache(0, 'https://example.com/items/pages')

      expect(result.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('retries on 503 status', async () => {
      const mockResponse503 = new Response('Service Unavailable', { status: 503 })
      const mockResponse200 = new Response(JSON.stringify({ data: 'test' }), { status: 200 })

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockResponse503)
        .mockResolvedValueOnce(mockResponse200)

      const result = await fetchRetryAndCache(0, 'https://example.com/items/pages')

      expect(result.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('retries on 504 status', async () => {
      const mockResponse504 = new Response('Gateway Timeout', { status: 504 })
      const mockResponse200 = new Response(JSON.stringify({ data: 'test' }), { status: 200 })

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockResponse504)
        .mockResolvedValueOnce(mockResponse200)

      const result = await fetchRetryAndCache(0, 'https://example.com/items/pages')

      expect(result.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('does not retry on 400 status', async () => {
      const mockResponse400 = new Response('Bad Request', { status: 400 })

      global.fetch = vi.fn().mockResolvedValue(mockResponse400)

      const result = await fetchRetryAndCache(0, 'https://example.com/items/pages')

      expect(result.status).toBe(400)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('does not retry on 404 status', async () => {
      const mockResponse404 = new Response('Not Found', { status: 404 })

      global.fetch = vi.fn().mockResolvedValue(mockResponse404)

      const result = await fetchRetryAndCache(0, 'https://example.com/items/pages')

      expect(result.status).toBe(404)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('does not retry on 500 status', async () => {
      const mockResponse500 = new Response('Internal Server Error', { status: 500 })

      global.fetch = vi.fn().mockResolvedValue(mockResponse500)

      const result = await fetchRetryAndCache(0, 'https://example.com/items/pages')

      expect(result.status).toBe(500)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('stops retrying after max attempts', async () => {
      const mockResponse429 = new Response('Too Many Requests', { status: 429 })

      global.fetch = vi.fn().mockResolvedValue(mockResponse429)

      // Start at count=3, so no more retries (count > 2)
      const result = await fetchRetryAndCache(3, 'https://example.com/items/pages')

      expect(result.status).toBe(429)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('retries on network error', async () => {
      const networkError = new Error('Network error')
      const mockResponse200 = new Response(JSON.stringify({ data: 'test' }), { status: 200 })

      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockResponse200)

      const result = await fetchRetryAndCache(0, 'https://example.com/items/pages')

      expect(result.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('throws after max network error retries', async () => {
      const networkError = new Error('Network error')

      global.fetch = vi.fn().mockRejectedValue(networkError)

      // Start at count=3, so no more retries (count > 2)
      await expect(fetchRetryAndCache(3, 'https://example.com/items/pages')).rejects.toThrow(
        'Network error'
      )
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('passes options through to fetch', async () => {
      const mockResponse = new Response('OK', { status: 200 })
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      await fetchRetryAndCache(0, 'https://example.com/items/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/items/pages',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
  })
})
