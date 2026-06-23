import { COOKIE_NAME, MAX_AGE_SECONDS, signSessionToken } from '@/lib/auth'
import {
  exchangeCallback,
  NEXT_COOKIE,
  NONCE_COOKIE,
  PKCE_COOKIE,
  STATE_COOKIE,
} from '@/lib/entra'
import { publicUrl, safeNext } from '@/lib/public-url'
import { NextResponse, type NextRequest } from 'next/server'

function failure(request: NextRequest, error: string) {
  const url = publicUrl('/login', request)
  url.searchParams.set('error', error)
  return NextResponse.redirect(url, { status: 303 })
}

function callbackUrl(request: NextRequest): URL {
  const url = publicUrl('/api/auth/entra/callback', request)
  const requestUrl = new URL(request.url)

  requestUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value)
  })

  return url
}

export async function GET(request: NextRequest) {
  const codeVerifier = request.cookies.get(PKCE_COOKIE)?.value
  const expectedState = request.cookies.get(STATE_COOKIE)?.value
  const expectedNonce = request.cookies.get(NONCE_COOKIE)?.value
  const next = safeNext(request.cookies.get(NEXT_COOKIE)?.value ?? null)

  if (!codeVerifier || !expectedState || !expectedNonce) {
    return failure(request, 'entra_state_missing')
  }

  let token: string
  try {
    const identity = await exchangeCallback({
      callbackUrl: callbackUrl(request),
      codeVerifier,
      expectedState,
      expectedNonce,
    })
    token = await signSessionToken(identity)
  } catch (err) {
    console.error('Present Entra callback failed:', err)
    return failure(request, 'entra_exchange_failed')
  }

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
    response.cookies.delete(name)
  }
  return response
}
