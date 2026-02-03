import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // Validate that the URL is from Instagram's CDN
  const allowedHosts = [
    'scontent.cdninstagram.com',
    'scontent-',
    'video.cdninstagram.com',
    'cdninstagram.com',
    'instagram.f',
  ]

  let isAllowed = false
  try {
    const parsedUrl = new URL(url)
    isAllowed = allowedHosts.some(
      (host) => parsedUrl.hostname.includes(host) || parsedUrl.hostname.endsWith('.fbcdn.net')
    )
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (!isAllowed) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 })
  }

  try {
    // Build headers for the upstream request
    const upstreamHeaders: HeadersInit = {}

    // Pass through Range header for video streaming support
    const rangeHeader = request.headers.get('range')
    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader
    }

    const response = await fetch(url, {
      headers: upstreamHeaders,
      // Don't use Next.js cache for range requests
      cache: rangeHeader ? 'no-store' : 'default',
    })

    if (!response.ok && response.status !== 206) {
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const contentLength = response.headers.get('content-length')
    const contentRange = response.headers.get('content-range')
    const acceptRanges = response.headers.get('accept-ranges')

    // Build response headers
    const responseHeaders: HeadersInit = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      'Accept-Ranges': acceptRanges || 'bytes',
    }

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength
    }

    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange
    }

    // Stream the response body
    const body = response.body

    return new NextResponse(body, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Instagram media proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}
