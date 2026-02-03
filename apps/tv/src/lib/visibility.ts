import { draftMode } from 'next/headers'

export type ContentStatus = 'draft' | 'in_review' | 'published' | 'archived'

export type PreviewReason =
  | { type: 'draft' }
  | { type: 'in_review' }
  | { type: 'scheduled'; publishAt: Date }

export type VisibilityResult =
  | { visible: true; previewReason: null }
  | { visible: false; previewReason: null }
  | { visible: true; previewReason: PreviewReason }

const isDev = process.env.NODE_ENV === 'development'

/**
 * Check if content should be visible based on status and publish date.
 *
 * - Status not 'published' -> not visible (show badge in dev or draft mode)
 * - Status 'published' + publishedAt in future -> not visible (show badge in dev or draft mode)
 * - Status 'published' + (publishedAt null or past) -> visible everywhere
 */
export async function checkVisibility(
  status: string | null | undefined,
  publishedAt: string | null | undefined
): Promise<VisibilityResult> {
  const draft = await draftMode()
  const canPreview = draft.isEnabled || isDev

  // If status is not 'published', content is not visible
  if (status !== 'published') {
    if (canPreview) {
      if (status === 'draft') {
        return { visible: true, previewReason: { type: 'draft' } }
      }
      if (status === 'in_review') {
        return { visible: true, previewReason: { type: 'in_review' } }
      }
      // For archived or other statuses, show in preview mode without badge
      return { visible: true, previewReason: { type: 'draft' } }
    }
    return { visible: false, previewReason: null }
  }

  // Status is 'published' - check publish date
  if (publishedAt) {
    const publishDate = new Date(publishedAt)
    const now = new Date()

    if (publishDate > now) {
      // Scheduled for future
      if (canPreview) {
        return { visible: true, previewReason: { type: 'scheduled', publishAt: publishDate } }
      }
      return { visible: false, previewReason: null }
    }
  }

  // Published and either no publish date or publish date is in the past
  return { visible: true, previewReason: null }
}
