const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL

/**
 * Transforms Directus asset URLs in HTML content to use the image proxy.
 *
 * Converts URLs like:
 *   https://cms.tc-waiblingen.de/assets/abc123.jpg
 *   https://cms.tc-waiblingen.de/assets/abc123
 *
 * To:
 *   /api/images/abc123?key=richtext-image
 */
export function transformRichtextAssets(
  html: string,
  transformKey: string = 'richtext-image'
): string {
  if (!html || !DIRECTUS_URL) {
    return html
  }

  // Escape special regex characters in the Directus URL
  const escapedUrl = DIRECTUS_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Match: {directus-url}/assets/{assetId}{optional extension}{optional query params}
  const pattern = new RegExp(
    `${escapedUrl}/assets/(?<assetId>[\\w-]+)(?:\\.[a-zA-Z0-9]{3,4})?(?:\\?[^"'\\s]*)?`,
    'g'
  )

  return html.replace(pattern, (_match, _p1, _offset, _string, groups) => {
    const { assetId } = groups
    return `/api/images/${assetId}?key=${transformKey}`
  })
}
