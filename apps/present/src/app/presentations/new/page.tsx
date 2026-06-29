import { AdminShell } from '@/components/presentations/AdminShell'
import { PresentationForm } from '@/components/presentations/PresentationForm'
import { getDb } from '@/lib/db'
import { generatePresentationCode, reservePresentationCode } from '@/lib/presentation-code'

interface NewPresentationPageProps {
  searchParams?: Promise<{ error?: string }>
}

export default async function NewPresentationPage({ searchParams }: NewPresentationPageProps = {}) {
  const { error } = searchParams ? await searchParams : {}
  const suggestedCode = reservePresentationCode(getDb(), generatePresentationCode())

  return (
    <AdminShell>
      <div className="mb-5">
        <p className="mb-1 text-xs font-bold uppercase text-tcw-red-700">Access Flow</p>
        <h1 className="text-3xl font-bold text-body">Create presentation</h1>
      </div>
      <PresentationForm suggestedCode={suggestedCode} error={error} />
    </AdminShell>
  )
}
