import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL
  const directusToken = process.env.DIRECTUS_PUBLIC_TOKEN

  if (!id) {
    return NextResponse.json({ error: 'Missing file ID' }, { status: 400 })
  }

  if (!directusUrl || !directusToken) {
    return NextResponse.json({ error: 'Directus configuration missing' }, { status: 500 })
  }

  try {
    const response = await fetch(`${directusUrl}/assets/${id}?key=team-member`, {
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
    console.error('Team image proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
  }
}
