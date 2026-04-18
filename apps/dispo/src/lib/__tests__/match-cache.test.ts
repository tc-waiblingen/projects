import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearMatchCache, MATCH_CACHE_TTL_MS, withCache } from '../match-cache'

describe('match-cache', () => {
  beforeEach(() => {
    clearMatchCache()
  })

  it('runs the loader once for cached calls within TTL', async () => {
    const loader = vi.fn().mockResolvedValue('value')
    const a = await withCache('k', loader, 1000)
    const b = await withCache('k', loader, 1000 + 100)
    expect(a).toBe('value')
    expect(b).toBe('value')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('refetches after TTL expires', async () => {
    const loader = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    await withCache('k', loader, 1000)
    const second = await withCache('k', loader, 1000 + MATCH_CACHE_TTL_MS + 1)
    expect(second).toBe('second')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('keys cache entries independently', async () => {
    const a = vi.fn().mockResolvedValue('a-value')
    const b = vi.fn().mockResolvedValue('b-value')
    expect(await withCache('a', a, 0)).toBe('a-value')
    expect(await withCache('b', b, 0)).toBe('b-value')
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })
})
