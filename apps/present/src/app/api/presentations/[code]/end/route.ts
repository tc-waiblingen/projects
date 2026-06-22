import { getSession } from '@/lib/auth'
import { closeLiveKitRoom } from '@/lib/livekit'
import { canManagePresentation, endPresentation, getPresentationByCode } from '@/lib/presentations'
import { NextResponse, type NextRequest } from 'next/server'

interface EndRouteProps {
  params: Promise<{ code: string }>
}

export async function POST(_request: NextRequest, { params }: EndRouteProps) {
  const [{ code }, session] = await Promise.all([params, getSession()])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const presentation = getPresentationByCode(code)
  if (!presentation || !canManagePresentation(presentation, session)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const updated = endPresentation(code)
  if (updated) await closeLiveKitRoom(updated)
  return NextResponse.json({ presentation: updated })
}
