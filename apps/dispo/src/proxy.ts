import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth'
import { publicUrl } from '@/lib/public-url'

const PROTECTED_PATH_PREFIXES = ['/day', '/settings']
const PROTECTED_API_PREFIXES = ['/api/assignments', '/api/settings']

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

  const loginUrl = publicUrl('/login', request)
  loginUrl.searchParams.set('next', `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/', '/day/:path*', '/settings/:path*', '/api/assignments/:path*', '/api/settings/:path*'],
}
