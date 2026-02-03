import { NextRequest, NextResponse } from 'next/server'
import { verifySignature } from '@/lib/signing'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  // searchParams.get() already decodes the URL
  const mediaUrl = searchParams.get('url')
  const signature = searchParams.get('sig')

  if (!mediaUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 403 })
  }

  // Verify the signature - this ensures only server-signed URLs can be proxied
  if (!verifySignature(mediaUrl, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  try {
    const response = await fetch(mediaUrl, {
      next: { revalidate: 1800 }, // Cache for 30 minutes
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    console.error('Instagram media proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}
