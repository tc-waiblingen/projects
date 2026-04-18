import { getSession } from '@/lib/auth'
import { publicUrl } from '@/lib/public-url'
import { setPassword } from '@/lib/settings'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (session?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await request.formData().catch(() => null)
  const password = form?.get('password')
  const provided = typeof password === 'string' ? password : ''

  if (!provided) {
    const url = publicUrl('/settings', request)
    url.searchParams.set('error', 'empty')
    return NextResponse.redirect(url, { status: 303 })
  }

  await setPassword(provided)
  const url = publicUrl('/settings', request)
  url.searchParams.set('saved', '1')
  return NextResponse.redirect(url, { status: 303 })
}
