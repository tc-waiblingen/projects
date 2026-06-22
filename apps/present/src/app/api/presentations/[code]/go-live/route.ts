import { getSession } from '@/lib/auth'
import { ensureLiveKitRoom } from '@/lib/livekit'
import { canManagePresentation, getPresentationByCode, markPresentationLive } from '@/lib/presentations'
import { NextResponse, type NextRequest } from 'next/server'

interface GoLiveRouteProps {
  params: Promise<{ code: string }>
}

export async function POST(_request: NextRequest, { params }: GoLiveRouteProps) {
  const [{ code }, session] = await Promise.all([params, getSession()])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const presentation = getPresentationByCode(code)
  if (!presentation || !canManagePresentation(presentation, session)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (presentation.status === 'ended') {
    return NextResponse.json({ error: 'Presentation has ended' }, { status: 409 })
  }
  await ensureLiveKitRoom(presentation)
  const updated = markPresentationLive(code)
  return NextResponse.json({ presentation: updated })
}
