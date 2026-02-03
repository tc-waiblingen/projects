import { describe, expect, it, vi, afterEach } from 'vitest'
import { checkVisibility } from '../visibility'

// Mock next/headers
vi.mock('next/headers', () => ({
  draftMode: vi.fn(),
}))

import { draftMode } from 'next/headers'

describe('visibility', () => {
  const mockDraftMode = vi.mocked(draftMode)

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('checkVisibility', () => {
    describe('published content', () => {
      it('is visible when published with no date', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: false } as Awaited<ReturnType<typeof draftMode>>)
        const result = await checkVisibility('published', null)
        expect(result.visible).toBe(true)
        expect(result.previewReason).toBeNull()
      })

      it('is visible when published with past date', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: false } as Awaited<ReturnType<typeof draftMode>>)
        const pastDate = new Date(Date.now() - 86400000).toISOString() // Yesterday
        const result = await checkVisibility('published', pastDate)
        expect(result.visible).toBe(true)
        expect(result.previewReason).toBeNull()
      })

      it('is hidden when published with future date (no draft mode)', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: false } as Awaited<ReturnType<typeof draftMode>>)
        const futureDate = new Date(Date.now() + 86400000).toISOString() // Tomorrow
        const result = await checkVisibility('published', futureDate)
        // In production without draft mode, future content is hidden
        // Note: In dev mode (NODE_ENV=development), it would be visible
        // This test runs in test environment which behaves like production
        expect(result.visible).toBe(false)
        expect(result.previewReason).toBeNull()
      })

      it('is visible with scheduled badge when published with future date in draft mode', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: true } as Awaited<ReturnType<typeof draftMode>>)
        const futureDate = new Date(Date.now() + 86400000).toISOString() // Tomorrow
        const result = await checkVisibility('published', futureDate)
        expect(result.visible).toBe(true)
        expect(result.previewReason).toEqual({
          type: 'scheduled',
          publishAt: expect.any(Date),
        })
      })
    })

    describe('draft content', () => {
      it('is hidden without draft mode', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: false } as Awaited<ReturnType<typeof draftMode>>)
        const result = await checkVisibility('draft', null)
        // In test environment (not dev), draft content is hidden
        expect(result.visible).toBe(false)
        expect(result.previewReason).toBeNull()
      })

      it('is visible with draft badge in draft mode', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: true } as Awaited<ReturnType<typeof draftMode>>)
        const result = await checkVisibility('draft', null)
        expect(result.visible).toBe(true)
        expect(result.previewReason).toEqual({ type: 'draft' })
      })
    })

    describe('in_review content', () => {
      it('is hidden without draft mode', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: false } as Awaited<ReturnType<typeof draftMode>>)
        const result = await checkVisibility('in_review', null)
        expect(result.visible).toBe(false)
        expect(result.previewReason).toBeNull()
      })

      it('is visible with in_review badge in draft mode', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: true } as Awaited<ReturnType<typeof draftMode>>)
        const result = await checkVisibility('in_review', null)
        expect(result.visible).toBe(true)
        expect(result.previewReason).toEqual({ type: 'in_review' })
      })
    })

    describe('archived content', () => {
      it('is hidden without draft mode', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: false } as Awaited<ReturnType<typeof draftMode>>)
        const result = await checkVisibility('archived', null)
        expect(result.visible).toBe(false)
        expect(result.previewReason).toBeNull()
      })

      it('is visible with draft badge in draft mode', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: true } as Awaited<ReturnType<typeof draftMode>>)
        const result = await checkVisibility('archived', null)
        expect(result.visible).toBe(true)
        expect(result.previewReason).toEqual({ type: 'draft' })
      })
    })

    describe('edge cases', () => {
      it('handles null status as not published', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: false } as Awaited<ReturnType<typeof draftMode>>)
        const result = await checkVisibility(null, null)
        expect(result.visible).toBe(false)
      })

      it('handles undefined status as not published', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: false } as Awaited<ReturnType<typeof draftMode>>)
        const result = await checkVisibility(undefined, null)
        expect(result.visible).toBe(false)
      })

      it('handles invalid date string gracefully', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: false } as Awaited<ReturnType<typeof draftMode>>)
        const result = await checkVisibility('published', 'not-a-date')
        // Invalid date parses as NaN, comparison with now returns false
        // So it's treated as "not in the future" -> visible
        expect(result.visible).toBe(true)
      })

      it('handles empty date string', async () => {
        mockDraftMode.mockResolvedValue({ isEnabled: false } as Awaited<ReturnType<typeof draftMode>>)
        const result = await checkVisibility('published', '')
        // Empty string is falsy, so publishedAt check is skipped
        expect(result.visible).toBe(true)
      })
    })
  })
})
