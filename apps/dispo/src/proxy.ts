import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth'

const PROTECTED_PATH_PREFIXES = ['/day']
const PROTECTED_API_PREFIXES = ['/api/assignments']

function isProtected(pathname: string): boolean {
  if (pathname === '/') return true
  if (PROTECTED_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true
  if (PROTECTED_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true
  return false
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (!isProtected(pathname)) return NextResponse.next()

  const token = request.cookies.get(COOKIE_NAME)?.value
  if (await verifySessionToken(token)) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/', '/day/:path*', '/api/assignments/:path*'],
}
