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
import { fetchRetryAndCache } from './directus-fetch'

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
