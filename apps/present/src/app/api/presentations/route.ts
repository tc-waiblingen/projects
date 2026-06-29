import { getSession } from '@/lib/auth'
import { presentationFormErrorCode } from '@/lib/presentation-form-errors'
import { createPresentation } from '@/lib/presentations'
import { publicUrl } from '@/lib/public-url'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let presentation
  try {
    const form = await request.formData()
    presentation = await createPresentation({
      code: readFormString(form, 'code'),
      title: readRequiredFormString(form, 'title'),
      startsAt: readFormString(form, 'startsAt'),
      viewerPassword: readFormString(form, 'viewerPassword') ?? '',
      moderator: { sub: session.sub, name: session.name },
    })
  } catch (error) {
    const code = presentationFormErrorCode(error)
    if (!code) throw error
    const url = publicUrl('/presentations/new', request)
    url.searchParams.set('error', code)
    return NextResponse.redirect(url, { status: 303 })
  }

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
