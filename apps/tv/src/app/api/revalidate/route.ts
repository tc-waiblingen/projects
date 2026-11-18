import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

// Must run synchronously within the request: Next.js collects revalidated tags
// on the request's work store and flushes them when the handler finishes.
function revalidate(tag: string) {
  revalidateTag(tag, 'max')
  console.log(`[RevalidateTag] ${tag}`)
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
  revalidate(tag)

  // Revalidate all route cache to ensure layout-level data (globals) is refreshed
  revalidatePath('/', 'layout')
  console.log(`[RevalidatePath] / (layout)`)

  return NextResponse.json({ revalidated: true, tag })
}
