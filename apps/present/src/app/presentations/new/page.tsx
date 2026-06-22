import { AdminShell } from '@/components/presentations/AdminShell'
import { PresentationForm } from '@/components/presentations/PresentationForm'

export default function NewPresentationPage() {
  return (
    <AdminShell>
      <div className="mb-5">
        <p className="mb-1 text-xs font-bold uppercase text-tcw-red-700">Access Flow</p>
        <h1 className="text-3xl font-bold text-body">Create presentation</h1>
      </div>
      <PresentationForm />
    </AdminShell>
  )
}
