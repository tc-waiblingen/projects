import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { fetchRedirectByPath } from "@/lib/directus/fetchers"
import { publicUrl } from "@/lib/public-url"

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
    const redirect = await fetchRedirectByPath(pathname)
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

  // Check if this slug is a post by calling the API
  // We need to fetch post data to determine the redirect URL
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL
  const directusToken = process.env.DIRECTUS_TOKEN

  if (!directusUrl || !directusToken) {
    return NextResponse.next()
  }

  try {
    const response = await fetch(
      `${directusUrl}/items/posts?filter[slug][_eq]=${encodeURIComponent(slug)}&filter[status][_eq]=published&fields=slug,published_at&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${directusToken}`,
        },
      }
    )

    if (!response.ok) {
      return NextResponse.next()
    }

    const data = await response.json()
    const posts = data.data

    if (!posts || posts.length === 0) {
      // Not a post, let it pass through to the page router
      return NextResponse.next()
    }

    const post = posts[0]

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
