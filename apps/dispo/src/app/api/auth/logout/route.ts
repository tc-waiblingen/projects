import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth'
import { publicUrl } from '@/lib/public-url'

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(publicUrl('/login', request), { status: 303 })
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return response
}
