import { COOKIE_NAME, verifySessionToken } from '@/lib/auth'
import { publicUrl } from '@/lib/public-url'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATH_PREFIXES = ['/presentations', '/moderator']
const PROTECTED_API_PREFIXES = ['/api/presentations', '/api/livekit/moderator-token']

function isProtected(pathname: string): boolean {
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
  matcher: ['/presentations/:path*', '/moderator/:path*', '/api/presentations/:path*', '/api/livekit/moderator-token'],
}
