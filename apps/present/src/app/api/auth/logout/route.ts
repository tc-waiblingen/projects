import { COOKIE_NAME } from '@/lib/auth'
import { publicUrl } from '@/lib/public-url'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(publicUrl('/login', request), { status: 303 })
  response.cookies.delete(COOKIE_NAME)
  return response
}
