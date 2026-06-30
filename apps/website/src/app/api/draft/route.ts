import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { fetchPostForPreview } from '@/lib/directus/fetchers'

function appendVersion(path: string, version: string | null): string {
  if (!version) {
    return path
  }

  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}version=${encodeURIComponent(version)}`
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const secret = searchParams.get('secret')
  const slug = searchParams.get('slug')
  const collection = searchParams.get('collection')
  const version = searchParams.get('version')

  // Validate secret
  if (secret !== process.env.DRAFT_MODE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Enable draft mode
  const draft = await draftMode()
  draft.enable()

  // Determine redirect URL based on collection
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || ''
  let redirectUrl = '/'
  if (collection === 'pages') {
    redirectUrl = appendVersion(`/${slug || ''}`, version)
  } else if (collection === 'posts' && slug) {
    // Fetch post to get the year from published_at
    const post = await fetchPostForPreview(slug, undefined, version ?? undefined)
    if (post?.published_at) {
      const year = new Date(post.published_at).getFullYear()
      redirectUrl = appendVersion(`/news/${year}/${slug}`, version)
    } else {
      redirectUrl = appendVersion(`/news/${slug}`, version)
    }
  }

  redirect(`${baseUrl}${redirectUrl}`)
}
