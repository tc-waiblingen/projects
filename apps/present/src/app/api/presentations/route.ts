import { getSession } from '@/lib/auth'
import { createPresentation } from '@/lib/presentations'
import { publicUrl } from '@/lib/public-url'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData()
  const presentation = await createPresentation({
    code: readFormString(form, 'code'),
    title: readRequiredFormString(form, 'title'),
    startsAt: readFormString(form, 'startsAt'),
    viewerPassword: readFormString(form, 'viewerPassword') ?? '',
    moderator: { sub: session.sub, name: session.name },
  })

  return NextResponse.redirect(publicUrl(`/presentations/${presentation.code}/edit`, request), { status: 303 })
}

function readFormString(form: FormData, key: string): string | undefined {
  const value = form.get(key)
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readRequiredFormString(form: FormData, key: string): string {
  const value = readFormString(form, key)
  if (!value) throw new Error(`${key} is required`)
  return value
}
