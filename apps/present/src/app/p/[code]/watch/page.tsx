import { ViewerRoom } from '@/components/livekit/ViewerRoom'
import { getPresentationByCode } from '@/lib/presentations'
import { getViewerSession } from '@/lib/viewer-auth'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface WatchPageProps {
  params: Promise<{ code: string }>
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { code } = await params
  const presentation = getPresentationByCode(code)
  if (!presentation) notFound()
  const viewer = await getViewerSession(presentation.code)
  if (!viewer || viewer.code !== presentation.code || viewer.presentationId !== presentation.id) {
    redirect(`/p/${presentation.code}`)
  }

  return <ViewerRoom code={presentation.code} title={presentation.title} initialStatus={presentation.status} />
}
