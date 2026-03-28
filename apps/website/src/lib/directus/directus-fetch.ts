const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
export const RETRYABLE_STATUSES = new Set([429, 502, 503, 504])

/**
 * Extract collection name from Directus REST API URL
 * Handles: /items/{collection}, /items/{collection}/{id}
 */
export function extractCollectionFromUrl(url: string | URL | Request): string | null {
  const urlString =
    typeof url === 'string'
      ? url
      : url instanceof URL
        ? url.pathname
        : url.url

  const match = urlString.match(/\/items\/([^/?]+)/)
  return match?.[1] ?? null
}

export const fetchRetryAndCache = async (
  count: number,
  ...args: Parameters<typeof fetch>
): Promise<Response> => {
  const [url, options = {}] = args

  let nextOpts: { revalidate?: number; tags?: string[] } = {}
  if (process.env.NODE_ENV === 'production') {
    const collection = extractCollectionFromUrl(url)
    nextOpts = {
      revalidate: 30 * 60,
      tags: collection
        ? ['directus', `directus:collection:${collection}`]
        : ['directus'],
    }
  }

  const fetchOptions = { ...options, next: nextOpts } as RequestInit

  let response: Response
  try {
    response = await fetch(url, fetchOptions)
  } catch (error) {
    // Network error (DNS failure, connection refused, etc.)
    if (count > 2) throw error

    const message = error instanceof Error ? error.message : 'Unknown error'
    console.warn(`[Network] ${message} (Attempt ${count + 1}/4)`)
    await sleep(500 * Math.pow(2, count))
    return fetchRetryAndCache(count + 1, ...args)
  }

  if (count > 2 || !RETRYABLE_STATUSES.has(response.status)) {
    return response
  }

  console.warn(`[${response.status}] Retrying (Attempt ${count + 1}/4)`)
  await sleep(500 * Math.pow(2, count))
  return fetchRetryAndCache(count + 1, ...args)
}
