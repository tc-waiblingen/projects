import { getSession } from '@/lib/auth'
import { canManagePresentation, getPresentationByCode, logPresentationEvent, type PresentationEventType } from '@/lib/presentations'
import { NextResponse, type NextRequest } from 'next/server'

interface ScreenEventRouteProps {
  params: Promise<{ code: string }>
}

const SCREEN_EVENT_TYPES = new Set<PresentationEventType>(['screen_started', 'screen_changed'])

export async function POST(request: NextRequest, { params }: ScreenEventRouteProps) {
  const [{ code }, session] = await Promise.all([params, getSession()])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const presentation = getPresentationByCode(code)
  if (!presentation || !canManagePresentation(presentation, session)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (presentation.status === 'ended') {
    return NextResponse.json({ error: 'Presentation has ended' }, { status: 409 })
  }

  const body = (await request.json().catch(() => null)) as { type?: unknown } | null
  if (typeof body?.type !== 'string' || !SCREEN_EVENT_TYPES.has(body.type as PresentationEventType)) {
    return NextResponse.json({ error: 'Invalid screen event' }, { status: 400 })
  }

  logPresentationEvent(presentation.id, body.type as PresentationEventType, null)
  return NextResponse.json({ ok: true })
}
