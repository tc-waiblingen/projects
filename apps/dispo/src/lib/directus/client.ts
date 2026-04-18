import type { Schema } from '@/types/directus-schema'
import { createDirectus, readItems, rest, staticToken } from '@directus/sdk'
import { fetchRetryAndCache } from './directus-fetch'

let client: ReturnType<typeof create> | null = null

function create() {
  const url = process.env.NEXT_PUBLIC_DIRECTUS_URL
  const token = process.env.DIRECTUS_TOKEN
  if (!url) throw new Error('NEXT_PUBLIC_DIRECTUS_URL is not set')
  if (!token) throw new Error('DIRECTUS_TOKEN is not set')

  return createDirectus<Schema>(url, {
    globals: {
      fetch: (...args) => fetchRetryAndCache(0, ...args),
    },
  })
    .with(staticToken(token))
    .with(rest())
}

export function getDirectus() {
  if (!client) client = create()
  return { directus: client, readItems }
}
