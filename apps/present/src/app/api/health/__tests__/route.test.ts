// @vitest-environment node
import { getDb } from '@/lib/db'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}))

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('LIVEKIT_URL', 'ws://localhost:7880')
    vi.stubEnv('LIVEKIT_API_KEY', 'devkey')
    vi.stubEnv('LIVEKIT_API_SECRET', 'devsecretdevsecretdevsecretdevsecret')
    vi.stubEnv('PRESENT_PUBLIC_URL', 'http://localhost:3003')
    vi.stubEnv('PRESENT_SESSION_SECRET', 'devsecretdevsecretdevsecretdev12')
    vi.stubEnv('ENTRA_TENANT_ID', 'tenant-id')
    vi.stubEnv('ENTRA_CLIENT_ID', 'client-id')
    vi.stubEnv('ENTRA_CLIENT_SECRET', 'client-secret')
    vi.mocked(getDb).mockReturnValue(healthyDb())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reports healthy database and LiveKit config', async () => {
    const response = GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      ok: true,
      database: { ok: true },
      livekit: {
        configured: true,
        required: false,
        urlConfigured: true,
        apiKeyConfigured: true,
        apiSecretConfigured: true,
        apiUrlValid: true,
        urlUsesWss: false,
      },
      auth: {
        ready: true,
        required: false,
        publicUrlConfigured: true,
        publicUrlValid: true,
        publicUrlUsesHttps: false,
        sessionSecretConfigured: true,
        sessionSecretStrong: true,
        entraTenantConfigured: true,
        entraTenantSpecific: false,
        entraClientConfigured: true,
        entraClientSecretConfigured: true,
      },
    })
  })

  it('fails when LiveKit credentials are incomplete', async () => {
    vi.stubEnv('LIVEKIT_API_SECRET', '')

    const response = GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.livekit).toMatchObject({
      configured: false,
      required: false,
      urlConfigured: true,
      apiKeyConfigured: true,
      apiSecretConfigured: false,
      apiUrlValid: true,
      urlUsesWss: false,
    })
  })

  it('fails when the LiveKit URL is invalid', async () => {
    vi.stubEnv('LIVEKIT_URL', 'not a url')

    const response = GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.livekit).toMatchObject({
      configured: false,
      urlConfigured: true,
      apiKeyConfigured: true,
      apiSecretConfigured: true,
      apiUrlValid: false,
      urlUsesWss: false,
    })
  })

  it('fails when the database query fails', async () => {
    vi.mocked(getDb).mockReturnValue({
      prepare: vi.fn(() => {
        throw new Error('database unavailable')
      }),
    } as unknown as Database.Database)

    const response = GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toMatchObject({
      ok: false,
      database: { ok: false },
      livekit: { configured: true },
      auth: { ready: true },
    })
  })

  it('does not require Entra config in local development', async () => {
    vi.stubEnv('ENTRA_TENANT_ID', '')
    vi.stubEnv('ENTRA_CLIENT_ID', '')
    vi.stubEnv('ENTRA_CLIENT_SECRET', '')

    const response = GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.auth).toMatchObject({
      ready: true,
      required: false,
      entraTenantConfigured: false,
      entraTenantSpecific: false,
      entraClientConfigured: false,
      entraClientSecretConfigured: false,
    })
  })

  it('fails in production when moderator auth config is incomplete', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    stubProductionUrls()
    vi.stubEnv('ENTRA_CLIENT_SECRET', '')

    const response = GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.auth).toMatchObject({
      ready: false,
      required: true,
      publicUrlConfigured: true,
      publicUrlValid: true,
      publicUrlUsesHttps: true,
      sessionSecretConfigured: true,
      sessionSecretStrong: true,
      entraTenantConfigured: true,
      entraTenantSpecific: true,
      entraClientConfigured: true,
      entraClientSecretConfigured: false,
    })
    expect(JSON.stringify(body)).not.toContain('client-secret')
  })

  it('fails in production when the session secret is too short', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    stubProductionUrls()
    vi.stubEnv('PRESENT_SESSION_SECRET', 'short')

    const response = GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.auth).toMatchObject({
      ready: false,
      sessionSecretConfigured: true,
      sessionSecretStrong: false,
    })
    expect(JSON.stringify(body)).not.toContain('short')
  })

  it('fails in production when the public URL is invalid', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('LIVEKIT_URL', 'wss://live.tc-waiblingen.de')
    vi.stubEnv('PRESENT_PUBLIC_URL', 'not a url')

    const response = GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.auth).toMatchObject({
      ready: false,
      publicUrlConfigured: true,
      publicUrlValid: false,
      publicUrlUsesHttps: false,
    })
    expect(JSON.stringify(body)).not.toContain('not a url')
  })

  it('fails in production when the public URL is not HTTPS', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('LIVEKIT_URL', 'wss://live.tc-waiblingen.de')

    const response = GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.auth).toMatchObject({
      ready: false,
      publicUrlConfigured: true,
      publicUrlValid: true,
      publicUrlUsesHttps: false,
    })
    expect(JSON.stringify(body)).not.toContain('localhost:3003')
  })

  it('fails in production when the Entra tenant is generic', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    stubProductionUrls()
    vi.stubEnv('ENTRA_TENANT_ID', 'common')

    const response = GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.auth).toMatchObject({
      ready: false,
      entraTenantConfigured: true,
      entraTenantSpecific: false,
    })
    expect(JSON.stringify(body)).not.toContain('common')
  })

  it('fails in production when the LiveKit URL is not WSS', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PRESENT_PUBLIC_URL', 'https://present.tc-waiblingen.de')

    const response = GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.livekit).toMatchObject({
      configured: false,
      required: true,
      urlConfigured: true,
      apiUrlValid: true,
      urlUsesWss: false,
    })
    expect(JSON.stringify(body)).not.toContain('localhost:7880')
  })

  it('reports healthy production config with HTTPS and WSS URLs', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    stubProductionUrls()

    const response = GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      ok: true,
      livekit: {
        configured: true,
        required: true,
        urlUsesWss: true,
      },
      auth: {
        ready: true,
        required: true,
        publicUrlUsesHttps: true,
        entraTenantSpecific: true,
      },
    })
    expect(JSON.stringify(body)).not.toContain('client-secret')
    expect(JSON.stringify(body)).not.toContain('devsecretdevsecretdevsecretdevsecret')
  })
})

function stubProductionUrls() {
  vi.stubEnv('PRESENT_PUBLIC_URL', 'https://present.tc-waiblingen.de')
  vi.stubEnv('LIVEKIT_URL', 'wss://live.tc-waiblingen.de')
  vi.stubEnv('ENTRA_TENANT_ID', '12345678-1234-1234-1234-123456789abc')
}

function healthyDb(): Database.Database {
  return {
    prepare: vi.fn(() => ({
      get: vi.fn(() => ({ ok: 1 })),
    })),
  } as unknown as Database.Database
}
