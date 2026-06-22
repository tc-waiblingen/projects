import { buildAuthRequest, NEXT_COOKIE, NONCE_COOKIE, PKCE_COOKIE, STATE_COOKIE, TEMP_MAX_AGE_SECONDS } from '@/lib/entra'
import { publicUrl, safeNext } from '@/lib/public-url'
import { NextResponse, type NextRequest } from 'next/server'

function redirectUri(request: NextRequest): string {
  return publicUrl('/api/auth/entra/callback', request).toString()
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get('next'))
  const { url, codeVerifier, state, nonce } = await buildAuthRequest(redirectUri(request))
  const response = NextResponse.redirect(url)
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TEMP_MAX_AGE_SECONDS,
  }
  response.cookies.set(PKCE_COOKIE, codeVerifier, cookieOptions)
  response.cookies.set(STATE_COOKIE, state, cookieOptions)
  response.cookies.set(NONCE_COOKIE, nonce, cookieOptions)
  response.cookies.set(NEXT_COOKIE, next, cookieOptions)
  return response
}
