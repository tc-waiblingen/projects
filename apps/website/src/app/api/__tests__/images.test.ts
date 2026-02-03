import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../images/[id]/route'

describe('GET /api/images/[id]', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_DIRECTUS_URL', 'https://cms.example.com')
    vi.stubEnv('DIRECTUS_PUBLIC_TOKEN', 'test-token')
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('returns 400 when file ID is missing', async () => {
    const request = new NextRequest('https://localhost/api/images/')
    const response = await GET(request, { params: Promise.resolve({ id: '' }) })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Missing file ID')
  })

  it('returns 500 when Directus URL is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_DIRECTUS_URL', '')

    const request = new NextRequest('https://localhost/api/images/abc123')
    const response = await GET(request, { params: Promise.resolve({ id: 'abc123' }) })

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Directus configuration missing')
  })

  it('returns 500 when Directus token is not configured', async () => {
    vi.stubEnv('DIRECTUS_PUBLIC_TOKEN', '')

    const request = new NextRequest('https://localhost/api/images/abc123')
    const response = await GET(request, { params: Promise.resolve({ id: 'abc123' }) })

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Directus configuration missing')
  })

  it('proxies image successfully', async () => {
    const imageBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]) // PNG header
    const mockResponse = new Response(imageBuffer, {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    })

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    const request = new NextRequest('https://localhost/api/images/abc123')
    const response = await GET(request, { params: Promise.resolve({ id: 'abc123' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')

    expect(global.fetch).toHaveBeenCalledWith(
      'https://cms.example.com/assets/abc123',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      })
    )
  })

  it('passes query params to Directus', async () => {
    const mockResponse = new Response(new Uint8Array([0x89]), {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg' },
    })

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    const request = new NextRequest('https://localhost/api/images/abc123?width=200&height=100&fit=cover')
    const response = await GET(request, { params: Promise.resolve({ id: 'abc123' }) })

    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://cms.example.com/assets/abc123?width=200&height=100&fit=cover',
      expect.any(Object)
    )
  })

  it('returns Directus error status', async () => {
    const mockResponse = new Response('Not Found', { status: 404 })

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    const request = new NextRequest('https://localhost/api/images/nonexistent')
    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Image not found')
  })

  it('returns 500 on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'))

    const request = new NextRequest('https://localhost/api/images/abc123')
    const response = await GET(request, { params: Promise.resolve({ id: 'abc123' }) })

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to fetch image')
  })

  it('defaults Content-Type to image/jpeg', async () => {
    const mockResponse = new Response(new Uint8Array([0xff]), {
      status: 200,
      headers: {}, // No Content-Type header
    })

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    const request = new NextRequest('https://localhost/api/images/abc123')
    const response = await GET(request, { params: Promise.resolve({ id: 'abc123' }) })

    expect(response.headers.get('Content-Type')).toBe('image/jpeg')
  })
})
