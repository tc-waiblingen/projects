import type { Schema } from "@/types/directus-schema"
import type { RestClient } from "@directus/sdk"
import {
  aggregate,
  createDirectus,
  createItem,
  readFiles,
  readItem,
  readItems,
  readSingleton,
  readUser,
  rest,
  uploadFiles,
  staticToken,
} from "@directus/sdk"
import Queue from "p-queue"

// Helper for retrying fetch requests
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504])

/**
 * Extract collection name from Directus REST API URL
 * Handles: /items/{collection}, /items/{collection}/{id}
 */
function extractCollectionFromUrl(url: string | URL | Request): string | null {
  const urlString =
    typeof url === 'string'
      ? url
      : url instanceof URL
        ? url.pathname
        : url.url

  const match = urlString.match(/\/items\/([^/?]+)/)
  return match?.[1] ?? null
}

const fetchRetryAndCache = async (
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

// Queue for rate-limited requests
const queue = new Queue({ intervalCap: 10, interval: 500, carryoverConcurrencyCount: true })

const getDirectusUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_DIRECTUS_URL
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_DIRECTUS_URL environment variable is not set. ' +
      'Please add it to your .env.local file.'
    )
  }
  return url
}

const getDirectusToken = (): string => {
  const token = process.env.DIRECTUS_TOKEN
  if (!token) {
    throw new Error(
      'DIRECTUS_TOKEN environment variable is not set. ' +
      'Please add it to your .env.local file.'
    )
  }
  return token
}

const directus = createDirectus<Schema>(getDirectusUrl(), {
  globals: {
    fetch: (...args) => queue.add(() => fetchRetryAndCache(0, ...args)),
  },
})
  .with(staticToken(getDirectusToken()))
  .with(rest())

export const getDirectus = () => ({
  directus: directus as RestClient<Schema>,
  aggregate,
  readFiles,
  readItems,
  readItem,
  readSingleton,
  readUser,
  createItem,
  uploadFiles,
  staticToken,
})

// Export internals for testing
export const _testHelpers = {
  extractCollectionFromUrl,
  fetchRetryAndCache,
  RETRYABLE_STATUSES,
  sleep,
}
