import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  NrConfigError,
  fetchNrMatches,
  fetchNrTournaments,
} from '../nr-client'

const originalFetch = globalThis.fetch

beforeEach(() => {
  vi.stubEnv('NR_API_URL', 'https://nr.test.local')
  vi.stubEnv('NR_API_TOKEN', 'secret-token')
  vi.stubEnv('NR_CLUB_ID', 'tcw-123')
})

afterEach(() => {
  vi.unstubAllEnvs()
  globalThis.fetch = originalFetch
})

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('fetchNrMatches', () => {
  it('sends bearer auth and correct URL / params', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ items: [], lastRefreshedAt: '' }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await fetchNrMatches(new Date(2026, 0, 1), new Date(2026, 11, 31))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = (fetchMock.mock.calls[0] as unknown) as [string, RequestInit]
    expect(url).toContain('https://nr.test.local/v1/clubs/tcw-123/matches')
    expect(url).toContain('from=2026-01-01')
    expect(url).toContain('to=2026-12-31')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer secret-token')
    expect(headers.Accept).toBe('application/json')
  })

  it('throws NrConfigError when env vars missing', async () => {
    vi.stubEnv('NR_API_TOKEN', '')
    await expect(
      fetchNrMatches(new Date(), new Date()),
    ).rejects.toBeInstanceOf(NrConfigError)
  })

  it('throws on non-2xx response', async () => {
    globalThis.fetch = (async () =>
      new Response('unauthorized', { status: 401 })) as typeof fetch
    await expect(fetchNrMatches(new Date(), new Date())).rejects.toThrow(
      /401/,
    )
  })

  it('returns items from successful response', async () => {
    globalThis.fetch = (async () =>
      jsonResponse({
        items: [{ id: 'm1', homeTeam: 'A', awayTeam: 'B' }],
        lastRefreshedAt: '2026-04-14T00:00:00Z',
      })) as typeof fetch
    const items = await fetchNrMatches(new Date(), new Date())
    expect(items).toHaveLength(1)
    expect(items[0]!.id).toBe('m1')
  })

  it('strips trailing slash from base URL', async () => {
    vi.stubEnv('NR_API_URL', 'https://nr.test.local/')
    const fetchMock = vi.fn(async () =>
      jsonResponse({ items: [], lastRefreshedAt: '' }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch
    await fetchNrMatches(new Date(2026, 0, 1), new Date(2026, 0, 2))
    const url = (fetchMock.mock.calls[0] as unknown as [string])[0]
    expect(url.startsWith('https://nr.test.local/v1/clubs/')).toBe(true)
  })
})

describe('fetchNrTournaments', () => {
  it('hits the tournaments endpoint', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ items: [], lastRefreshedAt: '' }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await fetchNrTournaments(new Date(2026, 2, 1), new Date(2026, 2, 31))

    const url = (fetchMock.mock.calls[0] as unknown as [string])[0]
    expect(url).toContain('/v1/clubs/tcw-123/tournaments')
    expect(url).toContain('from=2026-03-01')
    expect(url).toContain('to=2026-03-31')
  })
})
