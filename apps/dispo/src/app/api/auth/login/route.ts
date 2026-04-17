import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_NAME, isValidPassword, MAX_AGE_SECONDS, signSessionToken } from '@/lib/auth'

const OPERATOR_SUB = 'local:operator'

function safeNext(raw: string | null): string {
  if (!raw) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  return raw
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null)
  const password = form?.get('password')
  const next = safeNext(form?.get('next')?.toString() ?? null)

  const provided = typeof password === 'string' ? password : undefined
  if (!isValidPassword(provided)) {
    const url = new URL('/login', request.url)
    url.searchParams.set('error', '1')
    if (next !== '/') url.searchParams.set('next', next)
    return NextResponse.redirect(url, { status: 303 })
  }

  const token = await signSessionToken({ sub: OPERATOR_SUB, role: 'operator' })
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 })
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
  return response
}
