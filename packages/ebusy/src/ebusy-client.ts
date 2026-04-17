/**
 * Client for the eBuSy API (Basic auth, JSON).
 * See OpenAPI spec at https://ebusy.tc-waiblingen.de/api.
 */

export class EbusyConfigError extends Error {
  constructor(missing: string) {
    super(`eBuSy env var not set: ${missing}`)
    this.name = 'EbusyConfigError'
  }
}

interface EbusyConfig {
  baseUrl: string
  user: string
  password: string
}

function readConfig(): EbusyConfig {
  const baseUrl = process.env.EBUSY_API_URL
  const user = process.env.EBUSY_API_USER
  const password = process.env.EBUSY_API_PASSWORD
  if (!baseUrl) throw new EbusyConfigError('EBUSY_API_URL')
  if (!user) throw new EbusyConfigError('EBUSY_API_USER')
  if (!password) throw new EbusyConfigError('EBUSY_API_PASSWORD')
  return { baseUrl: baseUrl.replace(/\/+$/, ''), user, password }
}

function encodeBasicAuth(user: string, password: string): string {
  return Buffer.from(`${user}:${password}`).toString('base64')
}

interface EbusyEnvelope<T> {
  error?: number | string | null
  message?: string | null
  response?: T
}

function isEnvelope(value: unknown): value is EbusyEnvelope<unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'response' in value
}

export const EBUSY_CACHE_TAG = 'ebusy'

export async function ebusyGet<T>(
  path: string,
  params: Record<string, string> = {},
  revalidateSeconds: number,
): Promise<T> {
  const config = readConfig()
  const url = new URL(`${config.baseUrl}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${encodeBasicAuth(config.user, config.password)}`,
      Accept: 'application/json',
    },
    next: { revalidate: revalidateSeconds, tags: [EBUSY_CACHE_TAG] },
  } as RequestInit)

  if (!response.ok) {
    throw new Error(`eBuSy ${path} failed: ${response.status} ${response.statusText}`)
  }

  const body = (await response.json()) as unknown
  console.log(`[ebusy] ${path} raw response:`, JSON.stringify(body, null, 2))
  if (isEnvelope(body)) {
    if (body.error && Number(body.error) !== 0) {
      throw new Error(`eBuSy ${path} error ${body.error}: ${body.message ?? 'unknown'}`)
    }
    return body.response as T
  }
  return body as T
}

export const _ebusyTestHelpers = {
  encodeBasicAuth,
}
