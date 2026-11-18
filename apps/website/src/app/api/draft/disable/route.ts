import { cookies, draftMode } from 'next/headers'
import { PREVIEW_VERSION_COOKIE } from '@/lib/preview-version'
import { NextResponse } from 'next/server'

export async function GET() {
  const draft = await draftMode()
  draft.disable()
  const cookieStore = await cookies()
  cookieStore.delete(PREVIEW_VERSION_COOKIE)
  return NextResponse.json({ disabled: true })
}
