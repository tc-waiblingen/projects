import { COOKIE_NAME, MAX_AGE_SECONDS, signSessionToken } from '@/lib/auth'
import {
  exchangeCallback,
  NEXT_COOKIE,
  NONCE_COOKIE,
  PKCE_COOKIE,
  STATE_COOKIE,
} from '@/lib/entra'
import { publicUrl, publicOrigin } from '@/lib/public-url'
import { NextResponse, type NextRequest } from 'next/server'

function safeNext(raw: string | undefined): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

function failure(request: NextRequest, code: string): NextResponse {
  const url = publicUrl('/login', request)
  url.searchParams.set('error', code)
  const response = NextResponse.redirect(url, { status: 303 })
  for (const name of [PKCE_COOKIE, STATE_COOKIE, NONCE_COOKIE, NEXT_COOKIE]) {
    response.cookies.set({ name, value: '', maxAge: 0, path: '/' })
  }
  return response
}

export async function GET(request: NextRequest) {
  const codeVerifier = request.cookies.get(PKCE_COOKIE)?.value
  const expectedState = request.cookies.get(STATE_COOKIE)?.value
  const expectedNonce = request.cookies.get(NONCE_COOKIE)?.value
  const next = safeNext(request.cookies.get(NEXT_COOKIE)?.value)

  if (!codeVerifier || !expectedState || !expectedNonce) {
    return failure(request, 'entra_state_missing')
  }

  let identity
  try {
    identity = await exchangeCallback({
      callbackUrl: new URL(request.nextUrl.pathname + request.nextUrl.search, publicOrigin(request)),
      codeVerifier,
      expectedState,
      expectedNonce,
    })
  } catch (err) {
    console.error('Entra callback failed:', err)
    return failure(request, 'entra_exchange_failed')
  }

  const token = await signSessionToken(identity)
  const response = NextResponse.redirect(publicUrl(next, request), { status: 303 })
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
  for (const name of [PKCE_COOKIE, STATE_COOKIE, NONCE_COOKIE, NEXT_COOKIE]) {
    response.cookies.set({ name, value: '', maxAge: 0, path: '/' })
  }
  return response
}
