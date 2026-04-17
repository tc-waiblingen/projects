import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

const DEBOUNCE_MS = 300

// In-memory map of pending revalidations (works for self-hosted/standalone)
const pendingRevalidations = new Map<string, NodeJS.Timeout>()

function debouncedRevalidate(tag: string) {
  // Cancel existing pending revalidation for this tag
  const existing = pendingRevalidations.get(tag)
  if (existing) {
    clearTimeout(existing)
  }

  // Schedule new revalidation after debounce period
  const timeout = setTimeout(() => {
    revalidateTag(tag, 'max')
    pendingRevalidations.delete(tag)
    console.log(`[RevalidateTag] ${tag}`)
  }, DEBOUNCE_MS)

  pendingRevalidations.set(tag, timeout)
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidation-secret')

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { collection?: string; tag?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { collection, tag: rawTag } = body

  if (!collection && !rawTag) {
    return NextResponse.json({ error: 'Missing collection or tag' }, { status: 400 })
  }

  const tag = rawTag ?? `directus:collection:${collection}`
  debouncedRevalidate(tag)

  // Revalidate all route cache to ensure layout-level data (globals) is refreshed
  revalidatePath('/', 'layout')
  console.log(`[RevalidatePath] / (layout)`)

  return NextResponse.json({ scheduled: true, tag, debounceMs: DEBOUNCE_MS })
}
