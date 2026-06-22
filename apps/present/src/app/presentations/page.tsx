import { AdminShell } from '@/components/presentations/AdminShell'
import { StatusBadge } from '@/components/presentations/StatusBadge'
import { getSession } from '@/lib/auth'
import { listPresentationsForModerator } from '@/lib/presentations'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PresentationsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const presentations = listPresentationsForModerator(session.sub, session.role)

  return (
    <AdminShell>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase text-tcw-red-700">Presentations</p>
          <h1 className="text-3xl font-bold text-body">Screen sharing sessions</h1>
        </div>
        <a className="rounded-md bg-tcw-red-700 px-4 py-2 font-semibold text-white hover:bg-tcw-red-500" href="/presentations/new">
          New presentation
        </a>
      </div>

      <div className="overflow-hidden rounded-lg border border-tcw-accent-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-tcw-accent-50 text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {presentations.map((presentation) => (
              <tr key={presentation.id} className="border-t border-tcw-accent-100">
                <td className="px-4 py-3 font-semibold">{presentation.title}</td>
                <td className="px-4 py-3 font-mono">{presentation.code}</td>
                <td className="px-4 py-3"><StatusBadge status={presentation.status} /></td>
                <td className="px-4 py-3 text-muted">{presentation.startsAt ?? '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <a className="rounded border border-tcw-accent-200 px-2 py-1 font-semibold hover:bg-tcw-accent-50" href={`/presentations/${presentation.code}/edit`}>
                      Edit
                    </a>
                    <a className="rounded border border-tcw-accent-200 px-2 py-1 font-semibold hover:bg-tcw-accent-50" href={`/moderator/${presentation.code}`}>
                      Control
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {presentations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No presentations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  )
}
