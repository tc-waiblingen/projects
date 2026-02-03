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
    const response = await fetch(`${directusUrl}/assets/${id}?download=true`, {
      headers: {
        Authorization: `Bearer ${directusToken}`,
      },
      next: { revalidate: 1800 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'File not found' }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const contentDisposition = response.headers.get('content-disposition')
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        ...(contentDisposition && { 'Content-Disposition': contentDisposition }),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('File proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 })
  }
}
