/**
 * Fetch the raw site-plan SVG file bytes from Directus assets.
 *
 * Uses `DIRECTUS_TOKEN` server-side so the token never reaches the browser.
 * The SVG is inlined into a server-rendered client component, so a browser
 * image-proxy route is not needed.
 */
export async function fetchAreaMapSvg(fileId: string): Promise<string | null> {
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL
  const directusToken = process.env.DIRECTUS_TOKEN
  if (!directusUrl || !directusToken) return null

  try {
    const response = await fetch(`${directusUrl}/assets/${fileId}`, {
      headers: { Authorization: `Bearer ${directusToken}` },
      next: { revalidate: 3600 },
    })
    if (!response.ok) {
      console.error(`fetchAreaMapSvg: ${response.status} ${response.statusText}`)
      return null
    }
    return await response.text()
  } catch (error) {
    console.error('fetchAreaMapSvg failed:', error)
    return null
  }
}
