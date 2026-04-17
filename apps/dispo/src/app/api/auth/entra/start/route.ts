import {
  buildAuthRequest,
  NEXT_COOKIE,
  NONCE_COOKIE,
  PKCE_COOKIE,
  STATE_COOKIE,
  TEMP_MAX_AGE_SECONDS,
} from '@/lib/entra'
import { NextResponse, type NextRequest } from 'next/server'

function safeNext(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

function callbackUrl(request: NextRequest): string {
  return new URL('/api/auth/entra/callback', request.url).toString()
}

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get('next'))
  const redirectUri = callbackUrl(request)

  const { url, codeVerifier, state, nonce } = await buildAuthRequest(redirectUri)

  const response = NextResponse.redirect(url, { status: 302 })
  const secure = process.env.NODE_ENV === 'production'
  const baseCookie = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: TEMP_MAX_AGE_SECONDS,
  }
  response.cookies.set({ ...baseCookie, name: PKCE_COOKIE, value: codeVerifier })
  response.cookies.set({ ...baseCookie, name: STATE_COOKIE, value: state })
  response.cookies.set({ ...baseCookie, name: NONCE_COOKIE, value: nonce })
  response.cookies.set({ ...baseCookie, name: NEXT_COOKIE, value: next })
  return response
}
