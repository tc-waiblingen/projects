import { AdminShell } from '@/components/presentations/AdminShell'
import { PresentationForm } from '@/components/presentations/PresentationForm'
import { getSession } from '@/lib/auth'
import { canManagePresentation, getPresentationByCode } from '@/lib/presentations'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface EditPresentationPageProps {
  params: Promise<{ code: string }>
}

export default async function EditPresentationPage({ params }: EditPresentationPageProps) {
  const [{ code }, session] = await Promise.all([params, getSession()])
  if (!session) redirect('/login')
  const presentation = getPresentationByCode(code)
  if (!presentation || !canManagePresentation(presentation, session)) notFound()

  return (
    <AdminShell>
      <div className="mb-5">
        <p className="mb-1 text-xs font-bold uppercase text-tcw-red-700">Access Flow</p>
        <h1 className="text-3xl font-bold text-body">Edit presentation</h1>
      </div>
      <PresentationForm presentation={presentation} />
    </AdminShell>
  )
}
