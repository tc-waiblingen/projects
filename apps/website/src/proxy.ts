import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { fetchRedirectByPath } from "@/lib/directus/fetchers"
import { publicUrl } from "@/lib/public-url"

const PROXY_LOOKUP_TTL_MS = 5 * 60 * 1000

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

interface LegacyPostLookup {
  slug: string
  published_at: string | null
}

const redirectCache = new Map<string, CacheEntry<Awaited<ReturnType<typeof fetchRedirectByPath>> | null>>()
const legacyPostCache = new Map<string, CacheEntry<LegacyPostLookup | null>>()

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return undefined
  }

  return entry.value
}

function setCached<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + PROXY_LOOKUP_TTL_MS,
  })
}

async function getRedirect(pathname: string) {
  const cached = getCached(redirectCache, pathname)
  if (cached !== undefined) return cached

  const redirect = await fetchRedirectByPath(pathname)
  setCached(redirectCache, pathname, redirect ?? null)
  return redirect ?? null
}

async function getLegacyPost(slug: string): Promise<LegacyPostLookup | null> {
  const cached = getCached(legacyPostCache, slug)
  if (cached !== undefined) return cached

  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL
  const directusToken = process.env.DIRECTUS_TOKEN

  if (!directusUrl || !directusToken) {
    return null
  }

  const response = await fetch(
    `${directusUrl}/items/posts?filter[slug][_eq]=${encodeURIComponent(slug)}&filter[status][_eq]=published&fields=slug,published_at&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${directusToken}`,
      },
      next: { revalidate: 1800 },
    }
  )

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  const posts = data.data
  const post = posts?.[0] ?? null

  setCached(legacyPostCache, slug, post)
  return post
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip internal Next.js paths and static assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Check for Directus redirects first
  try {
    const redirect = await getRedirect(pathname)
    if (redirect?.url_to) {
      const status = redirect.response_code === "302" ? 302 : 301
      return NextResponse.redirect(publicUrl(redirect.url_to, request), status)
    }
  } catch {
    // On error, continue without redirect
  }

  // Skip paths under /news for post slug handling
  if (pathname.startsWith("/news")) {
    return NextResponse.next()
  }

  // Extract potential slug (remove leading/trailing slashes)
  const slug = pathname.replace(/^\/|\/$/g, "")

  // Skip if empty or has multiple segments (those are pages, not posts)
  if (!slug || slug.includes("/")) {
    return NextResponse.next()
  }

  try {
    const post = await getLegacyPost(slug)
    if (!post) {
      // Not a post, let it pass through to the page router
      return NextResponse.next()
    }

    // Build the redirect URL
    let redirectUrl: string
    if (post.published_at) {
      const year = new Date(post.published_at).getFullYear()
      redirectUrl = `/news/${year}/${post.slug}`
    } else {
      redirectUrl = `/news/${post.slug}`
    }

    // Redirect to the canonical post URL
    return NextResponse.redirect(publicUrl(redirectUrl, request), 301)
  } catch {
    // On error, let the request pass through
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
