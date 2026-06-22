import { getSession } from '@/lib/auth'
import { createModeratorToken, getLiveKitConfig } from '@/lib/livekit'
import { canManagePresentation, getPresentationByCode } from '@/lib/presentations'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { code?: string } | null
  if (!body?.code) return NextResponse.json({ error: 'code is required' }, { status: 400 })
  const presentation = getPresentationByCode(body.code)
  if (!presentation || !canManagePresentation(presentation, session)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (presentation.status === 'ended') {
    return NextResponse.json({ error: 'Presentation has ended' }, { status: 409 })
  }
  const token = await createModeratorToken(presentation, `moderator:${session.sub}`, session.name)
  return NextResponse.json({ token, url: getLiveKitConfig().url, room: presentation.livekitRoomName })
}
