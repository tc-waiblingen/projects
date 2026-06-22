import { COOKIE_NAME, MAX_AGE_SECONDS, signSessionToken } from '@/lib/auth'
import { publicUrl, safeNext } from '@/lib/public-url'
import { NextResponse, type NextRequest } from 'next/server'

function devAuthEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.PRESENT_DEV_AUTH === '1'
}

export async function GET(request: NextRequest) {
  if (!devAuthEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const requestUrl = new URL(request.url)
  const token = await signSessionToken({
    sub: 'dev:moderator',
    role: 'moderator',
    name: 'Local Moderator',
  })
  const response = NextResponse.redirect(publicUrl(safeNext(requestUrl.searchParams.get('next')), request), { status: 303 })
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
  return response
}
