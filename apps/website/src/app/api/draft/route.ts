import { cookies, draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { fetchPostForPreview } from '@/lib/directus/fetchers'
import { PREVIEW_VERSION_COOKIE } from '@/lib/preview-version'

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

  // Pages read the version from this cookie (searchParams would make them dynamic)
  const cookieStore = await cookies()
  if (version) {
    // Same attributes as Next's draft mode cookie, so it also works inside the Directus iframe
    const isDev = process.env.NODE_ENV === 'development'
    cookieStore.set(PREVIEW_VERSION_COOKIE, version, {
      httpOnly: true,
      path: '/',
      sameSite: isDev ? 'lax' : 'none',
      secure: !isDev,
    })
  } else {
    cookieStore.delete(PREVIEW_VERSION_COOKIE)
  }

  // Determine redirect URL based on collection
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || ''
  let redirectUrl = '/'
  if (collection === 'pages') {
    // Page permalinks already start with "/" — strip it to avoid a protocol-relative "//..." URL
    redirectUrl = `/${(slug || '').replace(/^\/+/, '')}`
  } else if (collection === 'posts' && slug) {
    // Fetch post to get the year from published_at
    const post = await fetchPostForPreview(slug, undefined, version ?? undefined)
    if (post?.published_at) {
      const year = new Date(post.published_at).getFullYear()
      redirectUrl = `/news/${year}/${slug}`
    } else {
      redirectUrl = `/news/${slug}`
    }
  }

  redirect(`${baseUrl}${redirectUrl}`)
}
