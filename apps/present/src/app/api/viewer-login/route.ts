import { getPresentationByCode } from '@/lib/presentations'
import { publicUrl } from '@/lib/public-url'
import { verifyViewerPassword } from '@/lib/viewer-password'
import { signViewerToken, VIEWER_MAX_AGE_SECONDS, viewerCookieName } from '@/lib/viewer-auth'
import { randomUUID } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (typeof code !== 'string') {
    return NextResponse.redirect(publicUrl('/p/invalid?error=1', request), { status: 303 })
  }

  const presentation = getPresentationByCode(code)
  if (!presentation || presentation.status === 'ended') {
    return NextResponse.redirect(publicUrl(`/p/${encodeURIComponent(code)}?error=1`, request), { status: 303 })
  }

  if (presentation.viewerPasswordHash !== '') {
    return NextResponse.redirect(publicUrl(`/p/${presentation.code}`, request), { status: 303 })
  }

  return createViewerSessionResponse(presentation, request)
}

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const code = form.get('code')
  const password = form.get('password')
  if (typeof code !== 'string' || typeof password !== 'string') {
    return NextResponse.redirect(publicUrl('/p/invalid?error=1', request), { status: 303 })
  }

  const presentation = getPresentationByCode(code)
  if (!presentation || presentation.status === 'ended') {
    return NextResponse.redirect(publicUrl(`/p/${encodeURIComponent(code)}?error=1`, request), { status: 303 })
  }

  if (!(await verifyViewerPassword(presentation.viewerPasswordHash, password))) {
    return NextResponse.redirect(publicUrl(`/p/${presentation.code}?error=1`, request), { status: 303 })
  }

  return createViewerSessionResponse(presentation, request)
}

async function createViewerSessionResponse(
  presentation: { id: number; code: string },
  request: NextRequest,
): Promise<NextResponse> {
  const viewerId = `viewer:${presentation.id}:${randomUUID()}`
  const token = await signViewerToken({ presentationId: presentation.id, code: presentation.code, viewerId })

  const response = NextResponse.redirect(publicUrl(`/p/${presentation.code}/watch`, request), { status: 303 })
  response.cookies.set({
    name: viewerCookieName(presentation.code),
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: VIEWER_MAX_AGE_SECONDS,
  })
  return response
}
