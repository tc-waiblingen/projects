import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// We need to mock the environment variable before importing the module
const MOCK_DIRECTUS_URL = 'https://cms.tc-waiblingen.de'

describe('transformRichtextAssets', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_DIRECTUS_URL', MOCK_DIRECTUS_URL)
    // Reset module cache to pick up new env var
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('transforms asset URL with extension', async () => {
    const { transformRichtextAssets } = await import('../transform-richtext-assets')
    const html = `<img src="${MOCK_DIRECTUS_URL}/assets/abc123.jpg" alt="test">`
    const result = transformRichtextAssets(html)
    expect(result).toBe('<img src="/api/images/abc123?key=richtext-image" alt="test">')
  })

  it('transforms asset URL without extension', async () => {
    const { transformRichtextAssets } = await import('../transform-richtext-assets')
    const html = `<img src="${MOCK_DIRECTUS_URL}/assets/abc123" alt="test">`
    const result = transformRichtextAssets(html)
    expect(result).toBe('<img src="/api/images/abc123?key=richtext-image" alt="test">')
  })

  it('transforms asset URL with query parameters', async () => {
    const { transformRichtextAssets } = await import('../transform-richtext-assets')
    const html = `<img src="${MOCK_DIRECTUS_URL}/assets/abc123.jpg?width=800&height=600" alt="test">`
    const result = transformRichtextAssets(html)
    expect(result).toBe('<img src="/api/images/abc123?key=richtext-image" alt="test">')
  })

  it('transforms multiple asset URLs', async () => {
    const { transformRichtextAssets } = await import('../transform-richtext-assets')
    const html = `
      <img src="${MOCK_DIRECTUS_URL}/assets/img1.jpg" alt="first">
      <img src="${MOCK_DIRECTUS_URL}/assets/img2.png" alt="second">
    `
    const result = transformRichtextAssets(html)
    expect(result).toContain('/api/images/img1?key=richtext-image')
    expect(result).toContain('/api/images/img2?key=richtext-image')
  })

  it('preserves non-Directus URLs', async () => {
    const { transformRichtextAssets } = await import('../transform-richtext-assets')
    const html = `<img src="https://other-site.com/image.jpg" alt="external">`
    const result = transformRichtextAssets(html)
    expect(result).toBe('<img src="https://other-site.com/image.jpg" alt="external">')
  })

  it('handles UUID-style asset IDs', async () => {
    const { transformRichtextAssets } = await import('../transform-richtext-assets')
    const html = `<img src="${MOCK_DIRECTUS_URL}/assets/a1b2c3d4-e5f6-7890-abcd-ef1234567890.webp">`
    const result = transformRichtextAssets(html)
    expect(result).toBe('<img src="/api/images/a1b2c3d4-e5f6-7890-abcd-ef1234567890?key=richtext-image">')
  })

  it('uses custom transform key', async () => {
    const { transformRichtextAssets } = await import('../transform-richtext-assets')
    const html = `<img src="${MOCK_DIRECTUS_URL}/assets/abc123.jpg">`
    const result = transformRichtextAssets(html, 'custom-key')
    expect(result).toBe('<img src="/api/images/abc123?key=custom-key">')
  })

  it('handles various file extensions', async () => {
    const { transformRichtextAssets } = await import('../transform-richtext-assets')

    const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif']
    for (const ext of extensions) {
      const html = `<img src="${MOCK_DIRECTUS_URL}/assets/test.${ext}">`
      const result = transformRichtextAssets(html)
      expect(result).toContain('/api/images/test?key=richtext-image')
    }
  })

  it('returns empty string for empty input', async () => {
    const { transformRichtextAssets } = await import('../transform-richtext-assets')
    expect(transformRichtextAssets('')).toBe('')
  })

  it('returns original HTML when no DIRECTUS_URL is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_DIRECTUS_URL', '')
    vi.resetModules()
    const { transformRichtextAssets } = await import('../transform-richtext-assets')
    const html = '<img src="https://example.com/assets/abc123.jpg">'
    const result = transformRichtextAssets(html)
    expect(result).toBe(html)
  })

  it('handles HTML with mixed content', async () => {
    const { transformRichtextAssets } = await import('../transform-richtext-assets')
    const html = `
      <h1>Article Title</h1>
      <p>Some text with an <img src="${MOCK_DIRECTUS_URL}/assets/inline.jpg" alt="inline"> image.</p>
      <figure>
        <img src="${MOCK_DIRECTUS_URL}/assets/figure.png" alt="figure">
        <figcaption>A caption</figcaption>
      </figure>
      <a href="https://example.com">External link</a>
    `
    const result = transformRichtextAssets(html)
    expect(result).toContain('/api/images/inline?key=richtext-image')
    expect(result).toContain('/api/images/figure?key=richtext-image')
    expect(result).toContain('https://example.com')
    expect(result).toContain('<h1>Article Title</h1>')
  })

  it('handles special characters in surrounding HTML', async () => {
    const { transformRichtextAssets } = await import('../transform-richtext-assets')
    const html = `<img src="${MOCK_DIRECTUS_URL}/assets/abc123.jpg" alt="Test & Demo">`
    const result = transformRichtextAssets(html)
    expect(result).toContain('alt="Test & Demo"')
    expect(result).toContain('/api/images/abc123?key=richtext-image')
  })
})
