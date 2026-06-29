import { getSession } from '@/lib/auth'
import { canManagePresentation, getPresentationByCode, updatePresentation, type PresentationStatus } from '@/lib/presentations'
import { publicUrl } from '@/lib/public-url'
import { NextResponse, type NextRequest } from 'next/server'

interface PresentationRouteProps {
  params: Promise<{ code: string }>
}

export async function POST(request: NextRequest, { params }: PresentationRouteProps) {
  const [{ code }, session] = await Promise.all([params, getSession()])
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const presentation = getPresentationByCode(code)
  if (!presentation || !canManagePresentation(presentation, session)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const form = await request.formData()
  await updatePresentation(code, {
    title: readRequiredFormString(form, 'title'),
    startsAt: readFormString(form, 'startsAt'),
    viewerPassword: shouldClearViewerPassword(form) ? '' : readFormString(form, 'viewerPassword'),
    status: readStatus(form),
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

function readStatus(form: FormData): PresentationStatus | undefined {
  const value = readFormString(form, 'status')
  if (value === 'draft' || value === 'ready') return value
  return undefined
}

function shouldClearViewerPassword(form: FormData): boolean {
  return form.get('clearViewerPassword') === '1'
}
