import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL
  const directusToken = process.env.DIRECTUS_PUBLIC_TOKEN

  if (!id) {
    return NextResponse.json({ error: 'Missing file ID' }, { status: 400 })
  }

  if (!directusUrl || !directusToken) {
    return NextResponse.json({ error: 'Directus configuration missing' }, { status: 500 })
  }

  // Pass through query params for Directus image transformations (width, height, fit, etc.)
  const searchParams = request.nextUrl.searchParams.toString()
  const queryString = searchParams ? `?${searchParams}` : ''

  try {
    const response = await fetch(`${directusUrl}/assets/${id}${queryString}`, {
      headers: {
        Authorization: `Bearer ${directusToken}`,
      },
      next: { revalidate: 1800 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Image not found' }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
  }
}
