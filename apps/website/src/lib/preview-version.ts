import { cookies, draftMode } from 'next/headers'

export const PREVIEW_VERSION_COOKIE = 'directus_preview_version'

/**
 * Directus content version to preview, set by /api/draft.
 *
 * Read from a cookie instead of searchParams: using the searchParams prop
 * forces the whole route to render dynamically, so no HTML gets prerendered
 * (and pagefind has nothing to index). cookies() is only touched when draft
 * mode is enabled, which is never the case during the build.
 */
export async function getPreviewVersion(): Promise<string | undefined> {
  const { isEnabled } = await draftMode()
  if (!isEnabled) {
    return undefined
  }
  return (await cookies()).get(PREVIEW_VERSION_COOKIE)?.value || undefined
}
