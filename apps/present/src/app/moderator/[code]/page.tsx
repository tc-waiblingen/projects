import { ModeratorRoom } from '@/components/livekit/ModeratorRoom'
import { getSession } from '@/lib/auth'
import { canManagePresentation, getPresentationByCode } from '@/lib/presentations'
import { publicUrl } from '@/lib/public-url'
import { createQrDataUrl } from '@/lib/qr'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface ModeratorPageProps {
  params: Promise<{ code: string }>
}

export default async function ModeratorPage({ params }: ModeratorPageProps) {
  const [{ code }, session] = await Promise.all([params, getSession()])
  if (!session) redirect('/login')
  const presentation = getPresentationByCode(code)
  if (!presentation || !canManagePresentation(presentation, session)) notFound()
  const viewerUrl = publicUrl(`/p/${presentation.code}`).toString()
  const viewerQrDataUrl = await createQrDataUrl(viewerUrl, 192)

  return (
    <ModeratorRoom
      code={presentation.code}
      title={presentation.title}
      initialStatus={presentation.status}
      viewerUrl={viewerUrl}
      viewerQrDataUrl={viewerQrDataUrl}
    />
  )
}
