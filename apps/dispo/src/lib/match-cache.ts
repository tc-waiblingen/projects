const TTL_MS = 5 * 60 * 1000

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export async function withCache<T>(
  key: string,
  loader: () => Promise<T>,
  now: number = Date.now(),
): Promise<T> {
  const cached = cache.get(key)
  if (cached && cached.expiresAt > now) {
    return cached.value as T
  }
  const value = await loader()
  cache.set(key, { value, expiresAt: now + TTL_MS })
  return value
}

export function clearMatchCache(): void {
  cache.clear()
}

export const MATCH_CACHE_TTL_MS = TTL_MS
