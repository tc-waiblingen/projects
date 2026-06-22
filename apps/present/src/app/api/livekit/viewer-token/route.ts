import { createViewerToken, getLiveKitConfig } from '@/lib/livekit'
import { getPresentationByCode } from '@/lib/presentations'
import { getViewerSession } from '@/lib/viewer-auth'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { code?: string } | null
  if (!body?.code) return NextResponse.json({ error: 'code is required' }, { status: 400 })
  const viewer = await getViewerSession(body.code)
  if (!viewer || viewer.code !== body.code) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const presentation = getPresentationByCode(body.code)
  if (!presentation || presentation.id !== viewer.presentationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (presentation.status === 'ended') {
    return NextResponse.json({ error: 'Presentation has ended' }, { status: 409 })
  }
  if (presentation.status !== 'live') {
    return NextResponse.json({ error: 'Presentation is not live' }, { status: 409 })
  }
  const token = await createViewerToken(presentation, viewer.viewerId)
  return NextResponse.json({ token, url: getLiveKitConfig().url, room: presentation.livekitRoomName })
}
